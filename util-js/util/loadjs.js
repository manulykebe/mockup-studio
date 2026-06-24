// (function( w ){
// 	function FatalError(message, file, line){
// 		function toString() {
// 			throw e;
// 		}
// 		var e = this;
// 		e["@message"] = message;
// 		e["@file"] = file || e.file || e.fileName;
// 		e["@line"] = line || e.line || e.lineNumber;
// 		if ("__defineGetter__" in e) {
// 			e.__defineGetter__("message", toString);
// 			e.__defineGetter__("description", toString);
// 		} else {
// 			e.message = e.description = {toString: toString};
// 		}
// 		// just in case, but not necessary
// 		e.toString = e.valueOf = toString;
// };
// (FatalError.prototype = new Error).name = "FatalError";

// if( typeof module !== "undefined" ){
// 	module.exports = FatalError
// }
// else {
// 	w.FatalError = FatalError
// }
// }( typeof global !== "undefined" ? global : this ));

var loadJSList=loadJSList||[];
(function( w ){
	var requestId
    var loadJSReady=function(f) {
        if (loadJSList.filter(function(r) { return r.s==0 }).length>0)
            requestAnimationFrame(function() {loadJSReady(f)})
        else
        {
            if (f!==undefined && typeof f=='function') f()
        }
    }
	
    var addOnLoad = function (o, f) {
        var _f = o.onload
        if (typeof o.onload != 'function') {
            o.onload = f
        } else {
            o.onload = function() {
            if (_f) {
                _f()
            }
            f()
            }
        }
	}

	var reLoadJS = function( src, callback, async ){
		loadJSList.splice(loadJSList.findIndex(function(l) {return l.src===src}),1)
		loadJS(src, callback, async)
		}

	var loadJS = function( src, callback, async, b ){
		"use strict"
		b=b||false
		let regexmin=/\.min\.js$/
		let regexn=/\.js$/

		if (location.hostname==='localhost'&&!b) src=src.replace(regexmin,'.js')
		if (location.hostname!=='localhost'&&!b) src=src.replace(regexn,'.min.js').replace('.min.min.','.min.')

		// if (location.hostname!=='localhost') 
			// if ( !b && (src.indexOf('.min.js')===-1)) src=src.toString().replaceAll('.js','.min.js')

		var found=loadJSList.find(x=>x.src===src.replace(regexmin,'.js'))
		if (found){
            if (found.s==-1) {
                return
            } 

			if (found.s===1) 
			{
				if (callback && typeof(callback) === "function") callback()
				return
			}
			else
			{
				if (callback && typeof(callback) === "function") {
					var script=document.querySelector('script[src^="'+src+'?_"]')
					if (!script) script=document.querySelector('script[src="'+src+'"]')
					if (script) addOnLoad(script, callback)
					else alert('loading error: '+src)
				}
				return
			}
        }
		var delimiter=(src.indexOf('?')>=0)?'&':'?'
        var _src=src+(document.location.host==='localhost'?'':(delimiter+'_='+Date.now()))
		var fl={el:'script',t:'text/javascript',l:'src'}
		if ((src.split('?').reverse()[0].split('.').reverse()[0])=='css')
			fl={el:'link',t:'text/css',l:'href'}
		var tmp
		var _hdscrpt=w.document.getElementsByTagName('head')[0].getElementsByTagName( 'script' )
		var ref = _hdscrpt[ _hdscrpt.length-1 ]
		var script = w.document.createElement( fl.el )
		script.type=fl.t
		script[fl.l] = _src
		if (fl.el==='link')
			script.rel='stylesheet'

		var _id=Math.random().toString(36).replace(/[^a-z0-9]+/g, '')
		script.id=_id
		if (typeof(callback) === 'boolean') {
			tmp = async
			async = callback
			callback = tmp
		}
		script.async = !async
		
		ref.parentNode.insertBefore( script, ref.nextSibling )

		loadJSList.push({id:script.id, src:src.replace(regexmin,'.js'),s:0,start:performance.now(), checkpoints: [1000, 2000, 5000, 5000]})
		
		addOnLoad(script, function() {

			var i=loadJSList.findIndex(x=>x.id===_id)
			if (i>-1) {
				loadJSList[i]={s:1,src:loadJSList[i].src,duration:parseInt((performance.now()-loadJSList[i].start)*10)/10}
				document.getElementById(_id).remove()

			}

		})

		if (callback && typeof(callback) === "function") {
			addOnLoad(script,callback)
		}

		var loop=function(time) {
			var slowRunningScripts=loadJSList.filter(lSL=>lSL.s===0&&Array.isArray(lSL.checkpoints)&&lSL.checkpoints.length>0).filter(lJL=>(performance.now()-lJL.start)>lJL.checkpoints[0])
			if (slowRunningScripts.length>0) {
                slowRunningScripts.forEach(sls=>{
                    var shift=true
                    if (sls.checkpoints.length===2) shift=false

                    if (shift) var i=sls.checkpoints.shift()
                    else i=sls.checkpoints[0]

                    console.log(`slow script loading detected ...${i/1000}s...: ${sls.src}.`)
                    
                    if (!shift) sls.checkpoints[0]+=sls.checkpoints[1]

                })
				
			}
			if (loadJSList.filter(x=>x.s===0).length>0)
				requestId=requestAnimationFrame(loop)
			// else
			// 	cancelAnimationFrame(requestId)
		}
		loop()

		script.onerror=function() {
			if (src.match(regexmin)&&!b) {
				document.getElementById(_id).remove()
				console.warn('fallback', `will try to load the non-minified script of ${src}`)
				loadJSList.splice(loadJSList.findIndex(x=>x.src===src.replace(regexmin,'.js')),1)
				var _src=src.replace(regexmin,'.js')
				loadJS( _src, callback, async, true )
				return
			}
			if (src.match(regexn)&&!b) {
				document.getElementById(_id).remove()
				console.warn('warning', `will try to load the minified script of ${src}`)
				loadJSList.splice(loadJSList.findIndex(x=>x.src===src.replace(regexmin,'.js')),1)
				var _src=src.replace(regexn,'.min.js')
				loadJS( _src, callback, async, true )
				return
			}
            if (b) {
    			document.getElementById(_id).remove()
                loadJSList
                    .filter(x=>x.src===src.replace(regexmin,'.js'))
                    .forEach(e=>_.merge(e,{s:-1, start: undefined}))
			    console.warn('kon benodigde script niet laden!\n'+src)
				// throw new FatalError('ihui')
                return 
            }
		}

		return script
	}

	if( typeof module !== "undefined" ){
		module.exports = loadJS
		module.exports = reLoadJS
		module.exports = loadJSReady
	}
	else {
		w.loadJS = loadJS
		w.reLoadJS = reLoadJS
		w.loadJSReady = loadJSReady
	}
	}( typeof global !== "undefined" ? global : this ))