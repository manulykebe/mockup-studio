if (typeof window !== 'undefined') {
    loadJS(`https://cdn.jsdelivr.net/gh/manulykebe/mockup-studio@main/grab_record_browser_list.js?_now=${Date.now()}`)
        .then(async () => {
            const rbl = document.getElementsByClassName('record-browser-list')[0]
            console.save(
                grabRecordBrowserResultToCsv(
                    await grabRecordBrowserList(rbl)
                ), 'export-' + document.URL + '.csv'
            )
        })
}