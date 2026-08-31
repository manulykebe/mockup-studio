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
    
    <svg aria-hidden="true" focusable="false" data-prefix="fal" data-icon="table"
        class="svg-inline--fa fa-table snb-icon text-inherit" role="img"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path fill="currentColor"
            d="M64 64C46.3 64 32 78.3 32 96l0 64 448 0 0-64c0-17.7-14.3-32-32-32L64 64zM32 192l0 112 208 0 0-112L32 192zm240 0l0 112 208 0 0-112-208 0zM240 336L32 336l0 80c0 17.7 14.3 32 32 32l176 0 0-112zm32 112l176 0c17.7 0 32-14.3 32-32l0-80-208 0 0 112zM0 96C0 60.7 28.7 32 64 32l384 0c35.3 0 64 28.7 64 64l0 320c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96z">
        </path>
    </svg></span></span></button>`;

    const binderElements = document.querySelectorAll(selector);

    binderElements.forEach((binder, idx) => {
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

                if (idx == 0) {
                    window.open('http://127.0.0.1:5501/Zontal', '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
                } else {
                    window.open('http://127.0.0.1:5501/Zontal/eln-mastersizer2000-pivotTable.html?pivot=%7B%22rows%22%3A%5B%22Custom+Information+Aggregate+Iri%22%2C%22Measurement+Time%22%2C%22Sample+Identifier%22%5D%2C%22columns%22%3A%5B%22Datum+Label%22%5D%2C%22values%22%3A%5B%7B%22field%22%3A%22Value%22%2C%22aggregate%22%3A%22table%22%7D%5D%2C%22rowVisibility%22%3A%7B%22Measurement+Time%22%3Atrue%2C%22Sample+Identifier%22%3Atrue%2C%22Custom+Information+Aggregate+Iri%22%3Afalse%7D%2C%22columnValueConfig%22%3A%7B%22Datum+Label%22%3A%7B%22order%22%3A%5B%22Instrument+serial+number%22%2C%22Concentration%22%2C%22Result+transform+type%22%2C%22Specific+surface+area%22%2C%22D+%5B4%2C+3%5D+-+Volume+weighted+mean%22%2C%22D+%5B3%2C+2%5D+-+Surface+weighted+mean%22%2C%22Start+result+channel+size%22%2C%22Last+result+channel+size%22%2C%22Particle+absorption+index%22%2C%22Obscuration%22%2C%22Residual%22%2C%22Span%22%2C%22Uniformity%22%2C%22Stirrer+speed%22%2C%22SOP+Name%22%2C%22Sample+source+type%22%5D%2C%22hidden%22%3A%5B%22Result+transform+type%22%2C%22Start+result+channel+size%22%2C%22Last+result+channel+size%22%2C%22Particle+absorption+index%22%2C%22Obscuration%22%2C%22Residual%22%2C%22Span%22%2C%22Uniformity%22%2C%22Sample+source+type%22%2C%22SOP+Name%22%2C%22Stirrer+speed%22%5D%2C%22labels%22%3A%7B%22D+%5B4%2C+3%5D+-+Volume+weighted+mean%22%3A%22D+%5B4%2C+3%5D%22%2C%22D+%5B3%2C+2%5D+-+Surface+weighted+mean%22%3A%22D+%5B3%2C+2%5D%22%7D%7D%7D%2C%22columnExpanded%22%3A%7B%22Datum+Label%22%3Afalse%7D%2C%22fieldLabels%22%3A%7B%22Datum+Label%22%3A%22Parameter%22%7D%2C%22panelCollapsed%22%3Atrue%7D', '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
                }
            });
            targetControls.insertBefore(button, targetControls.firstChild);
        }

        const template2 = document.createElement('template');
        template2.innerHTML = buttonHtml.trim();
        const button2 = template2.content.firstElementChild;
        if (button2) {
            button2.type = 'button';
            button2.className = 'd-flex align-items-center justify-content-center text-gray-500 text-gray-700-hover text-gray-700-focus btn btn-icon';
            button2.id = '6d09124d-d082-4982-b373-85618e850934';
            button2.setAttribute('aria-label', 'GxP Preparation Balance Measurement');
            button2.setAttribute('data-testid', 'icon-button-6d09124d-d082-4982-b373-85618e850934');
            button2.style.backgroundColor = '#fff9c4';
            button2.style.border = '2px solid #f2c100';
            button2.style.borderRadius = '50%';
            button2.style.boxShadow = '0 0 0 4px rgba(242, 193, 0, 0.24)';
            button2.addEventListener('click', () => {

                if (idx == 0) {
                    window.open('http://127.0.0.1:5501/Zontal/zontal-eln-mockup.html?&dateOperator=after&dateNot=false&dateValue1=2026-08-28', '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
                } else {
                    window.open('http://127.0.0.1:5501/Zontal/zontal-eln-mockup.html?instrumentClass=Particle+sizer&instrumentId=MASTERSIZER-3000&sampleId=S0033337&dateOperator=after&dateNot=false&dateValue1=2026-08-27&selected=urn%3Auuid%3Ad35df8f7-ad6f-4020-8c1c-db3cce9ce69c%2Curn%3Auuid%3A604e49b7-987c-4475-adee-7b46cbcc0ae7%2Curn%3Auuid%3A358a01a9-6a8f-4730-958c-8ae255049bf8%2Curn%3Auuid%3A1ed4b622-447c-45ba-b4bf-26445c96ecaf', '_blank', 'location=yes,toolbar=yes,scrollbars=yes,resizable=yes,width=800,height=600');
                }
            });
            targetControls.insertBefore(button2, targetControls.firstChild);
        }


    });
}

setTimeout(appendBalanceButtonToSampleBinderElements, 500);
