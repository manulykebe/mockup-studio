(function (w) {
	var loadJSConfig = {
		devMode: true
	}

	var getLoadJSList = function () {
		if (!Array.isArray(loadJS.list)) {
			loadJS.list = []
		}
		return loadJS.list
	}

	var requestId
	var loadJSReady = function (f) {
		if (getLoadJSList().filter(function (r) { return r.s == 0 }).length > 0)
			requestAnimationFrame(function () { loadJSReady(f) })
		else {
			if (f !== undefined && typeof f == 'function') f()
		}
	}

	var addOnLoad = function (o, f) {
		var _f = o.onload
		if (typeof o.onload != 'function') {
			o.onload = f
		} else {
			o.onload = function () {
				if (_f) {
					_f()
				}
				f()
			}
		}
	}

	var reLoadJS = async function (src, callback, async) {
		var loadJSList = getLoadJSList()
		loadJSList.splice(loadJSList.findIndex(function (l) { return l.src === src }), 1)
		return await loadJS(src, callback, async)
	}

	var purgeJsDelivr = function (src) {
		if (!/^https:\/\/cdn\.jsdelivr\.net\//.test(src)) {
			return Promise.resolve()
		}

		var purgeUrl = src.replace('https://cdn.jsdelivr.net/', 'https://purge.jsdelivr.net/')
		if (typeof fetch === 'function') {
			return fetch(purgeUrl, { method: 'GET', cache: 'no-store', mode: 'no-cors' }).then(function () {
				return undefined
			}).catch(function (err) {
				console.warn('warning', 'jsDelivr purge failed for ' + src, err)
			})
		}

		return new Promise(function (resolve) {
			var img = new Image()
			img.onload = img.onerror = function () {
				resolve()
			}
			img.src = purgeUrl + (purgeUrl.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now()
		})
	}

	var inspectScriptResponse = function (src) {
		if (typeof fetch !== 'function') {
			return Promise.resolve({ isJson: false })
		}

		return fetch(src, { method: 'GET', cache: 'no-store' }).then(function (response) {
			var contentType = (response.headers.get('content-type') || '').toLowerCase()
			return response.text().then(function (text) {
				var trimmed = text.trim()
				var looksLikeJson = contentType.indexOf('application/json') >= 0
					|| contentType.indexOf('text/json') >= 0
					|| ((trimmed[0] === '{' && trimmed[trimmed.length - 1] === '}')
						|| (trimmed[0] === '[' && trimmed[trimmed.length - 1] === ']'))

				if (!looksLikeJson) {
					return { isJson: false }
				}

				try {
					return {
						isJson: true,
						value: JSON.parse(trimmed)
					}
				} catch (err) {
					return { isJson: false }
				}
			})
		}).catch(function () {
			return { isJson: false }
		})
	}

	var loadJS = async function (src, callback, async, b) {
		b = b || false
		let regexmin = /\.min\.js$/
		let regexn = /\.js$/

		if (typeof (callback) === 'boolean') {
			var tmp = async
			async = callback
			callback = tmp
		}

		var callCallback = function (err, result) {
			if (typeof callback === 'function') {
				try {
					callback(err, result)
				} catch (ignored) {
				}
			}
		}

		if (!loadJSConfig.devMode && !b) {
			if (location.hostname === 'localhost') src = src.replace(regexmin, '.js')
			if (location.hostname !== 'localhost') src = src.replace(regexn, '.min.js').replace('.min.min.', '.min.')
		}
		if (loadJSConfig.devMode && !b && /^https:\/\/cdn\.jsdelivr\.net\//.test(src)) {
			await purgeJsDelivr(src)
		}

		var inspected = await inspectScriptResponse(src)
		if (inspected.isJson) {
			console.log(inspected.value)
			callCallback(null, inspected.value)
			return Promise.resolve(inspected.value)
		}

		var loadJSList = getLoadJSList()
		var normalizedSrc = src.replace(regexmin, '.js')
		var found = loadJSList.find(x => x.src === normalizedSrc)
		if (found) {
			if (found.s == -1) {
				var err = new Error('Failed to load script: ' + src)
				callCallback(err)
				return Promise.reject(err)
			}

			if (found.s === 1) {
				callCallback(null, found.script)
				return Promise.resolve(found.script)
			}

			if (found.promise) {
				found.promise.then(function (script) {
					callCallback(null, script)
				}).catch(callCallback)
				return found.promise
			}
		}

		var delimiter = (src.indexOf('?') >= 0) ? '&' : '?'
		var _src = src + (document.location.host === 'localhost' ? '' : (delimiter + '_=' + Date.now()))
		var fl = { el: 'script', t: 'text/javascript', l: 'src' }
		if ((src.split('?').reverse()[0].split('.').reverse()[0]) == 'css')
			fl = { el: 'link', t: 'text/css', l: 'href' }
		var _hdscrpt = w.document.getElementsByTagName('head')[0].getElementsByTagName('script')
		var ref = _hdscrpt[_hdscrpt.length - 1]
		var script = w.document.createElement(fl.el)
		script.type = fl.t
		script[fl.l] = _src
		if (fl.el === 'link')
			script.rel = 'stylesheet'

		var _id = Math.random().toString(36).replace(/[^a-z0-9]+/g, '')
		script.id = _id
		script.async = !async

		ref.parentNode.insertBefore(script, ref.nextSibling)

		var resolvePromise, rejectPromise
		var promise = new Promise(function (resolve, reject) {
			resolvePromise = resolve
			rejectPromise = reject
		})

		loadJSList.push({
			id: script.id,
			src: normalizedSrc,
			s: 0,
			start: performance.now(),
			checkpoints: [1000, 2000, 5000, 5000],
			promise: promise,
			resolve: resolvePromise,
			reject: rejectPromise,
			script: script
		})
		console.log(loadJSList);
		addOnLoad(script, function () {

			var i = loadJSList.findIndex(x => x.id === _id)
			if (i > -1) {
				loadJSList[i].s = 1
				loadJSList[i].duration = parseInt((performance.now() - loadJSList[i].start) * 10) / 10
				delete loadJSList[i].start
				loadJSList[i].resolve(script)
				document.getElementById(_id).remove()

			}

		})

		if (typeof callback === 'function') {
			promise.then(function (script) {
				callCallback(null, script)
			}).catch(callCallback)
		}

		var loop = function (time) {
			var slowRunningScripts = loadJSList.filter(lSL => lSL.s === 0 && Array.isArray(lSL.checkpoints) && lSL.checkpoints.length > 0).filter(lJL => (performance.now() - lJL.start) > lJL.checkpoints[0])
			if (slowRunningScripts.length > 0) {
				slowRunningScripts.forEach(sls => {
					var shift = true
					if (sls.checkpoints.length === 2) shift = false

					if (shift) var i = sls.checkpoints.shift()
					else i = sls.checkpoints[0]

					console.log(`slow script loading detected ...${i / 1000}s...: ${sls.src}.`)

					if (!shift) sls.checkpoints[0] += sls.checkpoints[1]

				})

			}
			if (loadJSList.filter(x => x.s === 0).length > 0)
				requestId = requestAnimationFrame(loop)
		}
		loop()

		script.onerror = function () {
			if (!loadJSConfig.devMode && src.match(regexmin) && !b) {
				document.getElementById(_id).remove()
				console.warn('fallback', `will try to load the non-minified script of ${src}`)
				loadJSList.splice(loadJSList.findIndex(x => x.src === normalizedSrc), 1)
				var _src = src.replace(regexmin, '.js')
				loadJS(_src, callback, async, true).then(resolvePromise).catch(rejectPromise)
				return
			}
			if (!loadJSConfig.devMode && src.match(regexn) && !b) {
				document.getElementById(_id).remove()
				console.warn('warning', `will try to load the minified script of ${src}`)
				loadJSList.splice(loadJSList.findIndex(x => x.src === normalizedSrc), 1)
				var _src = src.replace(regexn, '.min.js')
				loadJS(_src, callback, async, true).then(resolvePromise).catch(rejectPromise)
				return
			}
			document.getElementById(_id).remove()
			loadJSList
				.filter(x => x.src === normalizedSrc)
				.forEach(e => {
					if (typeof e.reject === 'function') {
						e.reject(new Error('Failed to load script: ' + src))
					}
					_.merge(e, { s: -1, start: undefined })
				})
			var err = new Error('kon benodigde script niet laden!\n' + src)
			callCallback(err)
			return
		}

		return promise
	}

	if (typeof module !== "undefined") {
		loadJS.list = getLoadJSList()
		var exported = {
			loadJS: loadJS,
			reLoadJS: reLoadJS,
			loadJSReady: loadJSReady,
			config: loadJSConfig
		}
		Object.defineProperty(exported, 'devMode', {
			get: function () { return loadJSConfig.devMode },
			set: function (value) { loadJSConfig.devMode = Boolean(value) }
		})
		module.exports = exported
	}
	else {
		loadJS.list = getLoadJSList()
		Object.defineProperty(loadJS, 'devMode', {
			get: function () { return loadJSConfig.devMode },
			set: function (value) { loadJSConfig.devMode = Boolean(value) }
		})
		loadJS.config = loadJSConfig
		w.loadJS = loadJS
		w.reLoadJS = reLoadJS
		w.loadJSReady = loadJSReady
	}
}(typeof global !== "undefined" ? global : this))


// example use:
// loadJS(`https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@main/signals/main.js?_now=${Date.now()}`, function() {
//     alert('ok');
// }, function() {
//     alert('nok');
// });

// cache-stable (recommended): pin to a commit SHA
// loadJS('https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@6642d97fa7b1cb47abcf8f742881b7d29fa6a9ca/grab_table.js')

// branch-based (can be stale on CDN edge cache)
// loadJS(`https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@main/add_column.js?_now=${Date.now()}`)
