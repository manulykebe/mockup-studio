loadJS(`https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@main/grab_record_browser_list.js?_now=${Date.now()}`)
.then(
     () => {
        console.save(
            grabRecordBrowserResultToCsv(
                await grabRecordBrowserList(document.getElementsByClassName('record-browser-list')[0])
            ), 'export-' + document.URL + '.json'
        )
    }
)