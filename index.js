const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fetch = require("node-fetch");

(async () => { 
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto('http://bug-hunt.roihunter.com/');

    const missingColumns = await page.evaluate(() => {
        let ths = document.querySelector('thead').querySelectorAll('th');
        const array = Array.from(ths, th => th.innerText);
        const recquiredColumns = ['id', 'Name', 'CPC', 'Impressions', 'Revenue', 'Clicks'];
        let output = [];
        
        for (let column of recquiredColumns) {
            if (!array.includes(column)) {
                output.push(column);
            }
        }
        return output;
    });

    const missingData = await page.evaluate(() => {
        const tds = document.querySelector('table').querySelectorAll('td');
        const data = Array.from(tds, td => td.innerText);
        return data.includes(null);
    });

    const sortable = await page.evaluate(async () => {
        let ths = document.querySelector('thead').querySelectorAll('th');

        const columnsNames = Array.from(ths, th => th.innerText);

        let outputAsc = [];
        let outputDesc = [];

        function getTds(colNum) {
            const rows = document.querySelector('tbody').querySelectorAll('tr');
            const tds = Array.from(rows, row => row.cells[colNum].innerText);
            return tds;
        }

        function sortIt(colNum) {
            const tds = getTds(colNum);
            const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
            return tds.sort(collator.compare);
        }

        function timeout(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        for (let i = 0; i < ths.length; i++) {        
            ths[i].click();
            await timeout(20);

            const sortedTds = JSON.stringify(sortIt(i));
            const sortedTdsReversed = JSON.stringify(sortIt(i).reverse());
            let unsortedTds = JSON.stringify(getTds(i));
  
            if (unsortedTds !== sortedTds) {
                console.log(unsortedTds);
                console.log(sortedTds);
                outputAsc.push(columnsNames[i]);
            }

            await timeout(20);
            ths[i].click();
            await timeout(20);

            unsortedTds = JSON.stringify(getTds(i));    

            if (unsortedTds !== sortedTdsReversed) {
                outputDesc.push(columnsNames[i]);
            }
            await timeout(20);
            ths[i].click();
            await timeout(20);
            
            unsortedTds = JSON.stringify(getTds(i));    

            if (unsortedTds !== sortedTds) {
                if (!outputAsc.includes(columnsNames[i])) {
                    outputAsc.push(columnsNames[i]);
                }
            }
            await timeout(20);
        }

        return [outputAsc, outputDesc];
    });

    const page2 = await browser.newPage();
    await page2.goto('https://www.countries-ofthe-world.com/world-currencies.html');

    const listOfValidCurrencies = await page2.evaluate(() => {
        const rows = document.querySelectorAll('.grey');
        var list = {};
        for (let row of rows) {
            let language = row.cells[1].innerText;
            if (language === 'European euro') language = 'Euro'
            const lng = row.cells[2].innerText;
            
            list[language] = lng;
        }
        return list;
    });
    await page2.close();

    async function exchangeRate(from, to) {
        if (from === to) {
            return 1;
        }
        let output;
    
        await fetch('https://api.exchangeratesapi.io/latest?base=' + from + '&symbols=' + to)
            .then(res => res.json())
            .then(resp => output = resp.rates[to]);

        return output;
    }

    await page.waitForSelector('.Select #react-select-2--value-item')
    await page.click('.Select #react-select-2--value-item')

    const number = await page.evaluate(() => {
        return document.querySelector('.Select-menu-outer').querySelectorAll('.Select-option').length;
    });

    const invalidCurrencies = [];
    const wrongExchangeRates = [];

    for (let i = 0; i < number; i++) {
        const boolean = await page.evaluate(() => {
            if (document.querySelector('.Select #react-select-2--value-item')) {
                return true;
            }
            return false;
        });

        if (boolean) {
            await page.waitForSelector('.Select #react-select-2--value-item')
            await page.click('.Select #react-select-2--value-item')
        } else {
            await page.waitForSelector('.rh-select > .Select > .Select-control > #react-select-2--value > .Select-placeholder')
            await page.click('.rh-select > .Select > .Select-control > #react-select-2--value > .Select-placeholder')  
        }
        
        await page.waitForSelector('.rh-select > .Select > .Select-menu-outer > .Select-menu > #react-select-2--option-' + i)
        await page.click('.rh-select > .Select > .Select-menu-outer > .Select-menu > #react-select-2--option-' + i);
    
        let oldLng = await page.evaluate(() => {
            let language = document.querySelector('.Select-value-label');
            if (language) {
                language = language.innerText;
            }
            const lng = document.querySelector('.Select > input').value;
            return [language, lng];
        });

        const oldRevenueValues = await page.evaluate(() => {
            const rows = document.querySelector('tbody').querySelectorAll('tr');
            const tds = Array.from(rows, row => parseFloat(row.cells[2].innerText.split(' ')[0]));
            return tds;
        });    

        for (let j=0; j < number; j++) {
            const boolean = await page.evaluate(() => {
                if (document.querySelector('.Select #react-select-2--value-item')) {
                    return true;
                }
                return false;
            });

            if (boolean) {
                await page.waitForSelector('.Select #react-select-2--value-item')
                await page.click('.Select #react-select-2--value-item')
            } else {
                await page.waitForSelector('.rh-select > .Select > .Select-control > #react-select-2--value > .Select-placeholder')
                await page.click('.rh-select > .Select > .Select-control > #react-select-2--value > .Select-placeholder')  
            }
            
            await page.waitForSelector('.rh-select > .Select > .Select-menu-outer > .Select-menu > #react-select-2--option-' + j)
            await page.click('.rh-select > .Select > .Select-menu-outer > .Select-menu > #react-select-2--option-' + j);
        
            const newLng = await page.evaluate(() => {
                let language = document.querySelector('.Select-value-label');
                if (language) {
                    language = language.innerText;
                }
                const lng = document.querySelector('.Select > input').value;
                return [language, lng];
            });

            const newRevenueValues = await page.evaluate(() => {
                const rows = document.querySelector('tbody').querySelectorAll('tr');
                const tds = Array.from(rows, row => parseFloat(row.cells[2].innerText.split(' ')[0]));
                return tds;
            });

            if (!listOfValidCurrencies[newLng[0]]) {
                if (!invalidCurrencies.includes(newLng[0])) {
                    invalidCurrencies.push(newLng[0]);
                }

            } else if (listOfValidCurrencies[oldLng[0]]) {
                const rate = await exchangeRate(oldLng[1], newLng[1]);
                
                for (let i = 0; i < oldRevenueValues.length; i++) {
                    if (newRevenueValues[i] / (oldRevenueValues[i] * rate) < 0.9 ||
                        newRevenueValues[i] / (oldRevenueValues[i] * rate) > 1.1) {
                            wrongExchangeRates.push(oldLng[0] + ' to ' + newLng[0]);
                        }
                    break;
                }
            }
        }
    }

    const names = await page.evaluate(() => {
        const rows = document.querySelector('tbody').querySelectorAll('tr');
        const tds = Array.from(rows, row => row.cells[1].innerText);
        return tds;
    })
    
    const searchingFailed = [];
    await page.focus('.rh-input')

    for (let name of names) {
        await page.keyboard.type(name.toUpperCase());
        let searchedNames = names.find(el => el.toUpperCase().includes(name.toUpperCase()));

        let actualNames = await page.evaluate(() => {
            const rows = document.querySelector('tbody').querySelectorAll('tr');
            const tds = Array.from(rows, row => row.cells[1].innerText);
            return tds;
        })

        if (JSON.stringify(searchedNames) !== JSON.stringify(actualNames)) {
            // console.log('searching failed on: ' + name.toUpperCase());
            searchingFailed.push(name.toUpperCase());

        }

        for (let i = 0; i < name.length; i++) {
            await page.keyboard.press('Backspace');
        }
        await page.keyboard.type(name.toLowerCase());
        searchedNames = names.find(el => el.toLowerCase().includes(name.toLowerCase()));

        actualNames = await page.evaluate(() => {
            const rows = document.querySelector('tbody').querySelectorAll('tr');
            const tds = Array.from(rows, row => row.cells[1].innerText);
            return tds;
        })

        if (JSON.stringify(searchedNames) !== JSON.stringify(actualNames)) {
            searchingFailed.push(name.toLowerCase());
        }

        for (let i = 0; i < name.length; i++) {
            await page.keyboard.press('Backspace');
        }
        await page.keyboard.type(name);
        searchedNames = names.find(el => el.includes(name));

        actualNames = await page.evaluate(() => {
            const rows = document.querySelector('tbody').querySelectorAll('tr');
            const tds = Array.from(rows, row => row.cells[1].innerText);
            return tds;
        });

        if (JSON.stringify(searchedNames) !== JSON.stringify(actualNames)) {
            searchingFailed.push(name);
        }

        for (let i = 0; i < name.length; i++) {
            await page.keyboard.press('Backspace');
        }
    }

    await page.setOfflineMode(true)

    const isOnBackEnd = await page.evaluate(() => {
        if (!document.querySelector('tbody').children.length) {
            return true;
        }
        return false;
    })

    let passed = 0;
    let failed = 0;
    
    if (missingColumns) {
        console.log('\x1b[31m', 'columns: ' + JSON.stringify(missingColumns) + ' are missing');
        failed++;        
    } else {
        console.log('\x1b[32m', 'missingColumns PASSED');
        passed++;
    }

    if (missingData) {
        console.log('\x1b[31m', 'some cells are empty');
        failed++;
    } else {
        console.log('\x1b[32m', 'missingColumnsData PASSED');
        passed++;
    }

    if (sortable[0]) {
        console.log('\x1b[31m', 'Ascending sorting doesn\'t work on columns: ' + JSON.stringify(sortable[0]));
        failed++;
    } else {
        console.log('\x1b[32m', 'Ascending sorting PASSED');
        passed++;
    }

    if (sortable[1]) {
        console.log('\x1b[31m', 'Descending sorting doesn\'t work on columns: ' + JSON.stringify(sortable[1]));
        failed++;
    } else {
        console.log('\x1b[32m', 'Descending sorting PASSED');
        passed++;
    }

    if (invalidCurrencies.length) {
        console.log('\x1b[31m', JSON.stringify(invalidCurrencies) + ' are not valid currencies');
        failed++;
    } else {
        console.log('\x1b[32m', 'invalid currencies PASSED');
        passed++;
    }

    if (wrongExchangeRates.length) {
        console.log('\x1b[31m', 'wrong currency exchange rates of: ' + JSON.stringify(wrongExchangeRates));
        failed++;
    } else {
        console.log('\x1b[32m', 'wrongExchangeRates PASSED');
        passed++;
    }

    if (isOnBackEnd) {
        console.log('\x1b[31m', 'searching is not on backend');
        failed++;
    } else {
        console.log('\x1b[32m', 'isOnBackEnd PASSED');
        passed++;
    }

    if (searchingFailed.length) {
        console.log('\x1b[31m', 'searching FAILED on: ' + JSON.stringify(searchingFailed));
        failed++;
    } else {
        console.log('\x1b[32m', 'SearchingFailed PASSED');
        passed++;
    }

    console.log();
    console.log('\x1b[32m', 'Passed tests: ' + passed);
    console.log('\x1b[31m', 'Failed tests: ' + failed);

    await browser.close();
})();

