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
    
    <svg aria-hidden="true" 
         class="snb-icon 
         svg-icon icon-2x" 
         fill="currentColor" 
         stroke="currentColor" 
         height="800px" 
         width="800px" 
         viewBox="0 0 462.587 462.587">
        <g id="XMLID_12_">
        <g>
            <path d="M457.012,206.595c-1.509-1.656-3.647-2.608-5.888-2.608h-15.69c0,0-54.307-103.321-57.115-108.681    c-3.012-5.747-7.57-10.778-14.387-10.778c-33.177,0-64.138-7.079-87.179-19.935c-11.496-6.414-20.164-13.917-25.46-21.803V20    c0-11.046-8.954-20-20-20c-11.046,0-20,8.954-20,20v22.79c-5.296,7.886-13.964,15.389-25.46,21.803    c-23.042,12.855-54.003,19.935-87.18,19.935c-6.817,0-10.923,4.181-14.387,10.778c-8.099,15.424-57.114,108.681-57.114,108.681    H11.463c-2.242,0-4.381,0.945-5.891,2.602c-1.51,1.658-2.25,3.874-2.045,6.107c4.394,47.706,44.521,85.063,93.374,85.063    s88.98-37.357,93.374-85.063c0.205-2.231-0.539-4.445-2.048-6.101c-1.509-1.656-3.647-2.608-5.888-2.608h-15.69l-47.389-90.282    c36.922-2.961,69.151-13.791,92.034-29.701v328.583h-90.649c-13.807,0-25,11.193-25,25s11.193,25,25,25h217.453    c13.807,0,25-11.193,25-25s-11.193-25-25-25h-86.804V84.004c22.883,15.91,55.112,26.741,92.033,29.701l-47.389,90.282h-15.69    c-2.242,0-4.381,0.945-5.891,2.602c-1.51,1.658-2.25,3.874-2.044,6.107c4.393,47.706,44.521,85.063,93.374,85.063    c48.853,0,88.98-37.357,93.374-85.063C459.266,210.465,458.521,208.252,457.012,206.595z M132.767,203.987H61.034l35.866-68.33    L132.767,203.987z M329.819,203.987l35.867-68.331l35.867,68.331H329.819z"></path>
        </g>
</g>
</svg></span></span></button>`;

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
                window.open('https://dev.ui.eln-integrations.im.jnj.com/balance-measurement-action.html?__eid=' + focus, '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
            });
            targetControls.insertBefore(button, targetControls.firstChild);
        }
    });
}

setTimeout(appendBalanceButtonToSampleBinderElements, 5000);
