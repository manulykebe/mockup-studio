function appendBalanceButtonToSampleBinderElements() {
    const selector = 'div.binder__element';
    const titleSelector = 'div.inline-input.primary';
    const controlsSelector = 'div.binder__element-header-controls';
    const buttonHtml = `
<button type="button" id="6d05124d-d082-4982-b373-85618e850934" 
    aria-label="GxP Preparation Balance Measurement" 
    data-testid="icon-button-6d05124d-d082-4982-b373-85618e850934" 
    class="d-flex align-items-center justify-content-center text-gray-500 text-gray-700-hover text-gray-700-focus btn btn-icon">
    <span class="d-inline-flex align-items-center">
    <span class="snb-icon encoded-svg-icon d-flex align-items-center justify-content-center external-actions-icon external-actions-icon--element-icon icon-lg">
    
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="custom-icon center-icon"><path fill="currentColor" d="M12 22a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137q-1.35-1.35-2.137-3.175A9.7 9.7 0 0 1 2 12q0-2.075.788-3.9a10.1 10.1 0 0 1 2.137-3.175q1.35-1.35 3.175-2.137A9.7 9.7 0 0 1 12 2q2.075 0 3.9.788a10.1 10.1 0 0 1 3.175 2.137q1.35 1.35 2.137 3.175A9.7 9.7 0 0 1 22 12v8q0 .824-.587 1.413A1.93 1.93 0 0 1 20 22zm0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4 6.325 6.325 4 12q0 .575.075 1.125T4.3 14.2L8 10.5l3.3 2.775L14.575 10H13V8h5v5h-2v-1.575L11.4 16l-3.275-2.8-2.95 2.95a8.1 8.1 0 0 0 2.837 2.788Q9.8 20 12 20m7.5.5q.424 0 .712-.288a.97.97 0 0 0 .288-.712.97.97 0 0 0-.288-.712.97.97 0 0 0-.712-.288.97.97 0 0 0-.712.288.97.97 0 0 0-.288.712q0 .424.288.712.287.288.712.288"></path></svg></span></span></button>`;

    const binderElements = document.querySelectorAll(selector);

    binderElements.forEach((binder) => {
        const titleDiv = binder.querySelector(titleSelector);
        if (!titleDiv) {
            return;
        }

        const titleText = titleDiv.textContent || '';
        if (!titleText.toLowerCase().includes('sample') && !titleText.toLowerCase().includes('prep')) {
            // return;
        }

        const controls = binder.querySelectorAll(controlsSelector);
        if (controls.length < 2) {
            return;
        }

        const targetControls = controls[1];
        if (targetControls.querySelector('[id="6d05124d-d082-4982-b373-85618e850934"]')) {
            return;
        }

        const table = binder.querySelector('div.table[role="table"][data-testid="grid-table"]');
        const productIds = [];

        if (table) {
            table.querySelectorAll('.td[data-testid="grid-cell-Product ID"]').forEach((cell) => {
                const span = cell.querySelector('span');
                const input = cell.querySelector('input');
                const value = (span?.textContent || input?.value || '').trim();
                if (value) productIds.push(value);
            });
        }

        console.log(productIds);

        const params = new URLSearchParams(window.location.search)
        const focus = params.get('focus') || 'grid%3Aef43efa0-9353-4078-b68b-acdeafecd2e4'

        const template = document.createElement('template');
        template.innerHTML = buttonHtml.trim();
        const button = template.content.firstElementChild;
        if (button) {
            button.type = 'button';
            button.className = 'd-flex align-items-center justify-content-center text-gray-500 text-gray-700-hover text-gray-700-focus btn btn-icon';
            button.id = '6d05124d-d082-4982-b373-85618e850934';
            button.setAttribute('aria-label', 'GxP Preparation Balance Measurement');
            button.setAttribute('data-testid', 'icon-button-6d05124d-d082-4982-b373-85618e850934');
            button.style.backgroundColor = '#fff9c4';
            button.style.border = '2px solid #f2c100';
            button.style.borderRadius = '50%';
            button.style.boxShadow = '0 0 0 4px rgba(242, 193, 0, 0.24)';
            button.addEventListener('click', () => {
                window.open('http://127.0.0.1:5500/prep_master.html?__eid=' + focus, '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
            });
            targetControls.insertBefore(button, targetControls.firstChild);
        }
    });
}

setTimeout(appendBalanceButtonToSampleBinderElements, 5000);
