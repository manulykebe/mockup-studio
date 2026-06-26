(function(console){
	// console.API;

	if (typeof console._commandLineAPI !== 'undefined') {
		console.API = console._commandLineAPI; //chrome
	} else if (typeof console._inspectorCommandLineAPI !== 'undefined') {
		console.API = console._inspectorCommandLineAPI; //Safari
	} else if (typeof console.clear !== 'undefined') {
		console.API = console;
	}
	// console.API.clear();

	if (location.hostname.indexOf('configurator')>-1)
		console.log = function() { return void 0 }


	console.load = function (filename, f ) {
		filename=filename||'console'
		$.ajax({
			url: `/resources/${filename}.json`,
			cache: true,
			dataType: 'text',
			error: function(xhr, status, error){
				var errorMessage = xhr.status + ': ' + xhr.statusText
				console.log(errorMessage,xhr, status, error)
				if (f!==undefined && typeof f==='function') f(self)
			},
			success: function(data) {

				var _data = JSON.parsef(data)
				for (var key in _data) {
					switch (key) {
						case 'user':
							var _user=JSON.parsef(_data['user'])
							localStorage.setItem('user',JSON.stringif(_user))
							break
						case 'transport':
							var _transport=JSON.parsef(_data['transport'])
							localStorage.setItem('transport',JSON.stringif(_transport))
							break
						case 'lyke':
							var _yaru=JSON.parsef(_data['lyke'])
							_yaru.forEach(function(_y) {
								var lyke=JSON.parsef(localStorage.getItem('lyke'))||[]
								if (!lyke.find(function(l) { return l===_y}))
								{
									lyke.push(_y)
									localStorage.setItem('lyke',JSON.stringif(lyke))
								}
								localStorage.setItem(_y,_data[_y])
							})
							break
						default:
							break;
					}
				}

				if (f!==undefined && typeof f==='function') f(self)

				INITIAL_LOAD=false

				console.log(undefined,`standaard voorbeelden ingelezen: ${filename}`)
			}
		})
	}

    console.save = function(data, filename, f){

        if(!data) {
            data = localStorage
        }
		var a=new Date()
		if(!filename) filename = a.toISOString()+'.json'

        if(typeof data === "object"){
            data = JSON.stringif(data, 4)
        }

        var blob = new Blob([data], {type: 'text/json'}),
            e    = document.createEvent('MouseEvents'),
            a    = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
        a.dispatchEvent(e)
	}



})(console)