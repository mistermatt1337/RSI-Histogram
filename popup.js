chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    console.log(activeTab);

    document.getElementById('parse').addEventListener('click', function() {
    // Check if the user is on the correct URL
    if (activeTab.url === 'https://robertsspaceindustries.com/account/billing') { // replace with the correct URL
        chrome.runtime.sendMessage({action: 'executeContentScript', tabId: activeTab.id}, function(response) {
            if (response && response.error) {
                alert('Error: ' + response.error + '. Please refresh the page and try again.');
            }
        });
    } else {
        alert('Please navigate to the Billing page and try again.');
    }    
    });
});
// Listen for a message from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'dataExtractionCompleted') {
        // Retrieve the ordersDataSet from local storage
        chrome.storage.local.get('ordersDataSet', function(result) {
            console.log(result);
            // Check if ordersDataSet is defined and is an array
            if (result.ordersDataSet && Array.isArray(result.ordersDataSet)) {
                try {
                    let ordersDataSet = result.ordersDataSet;

                    // Prepare the data for the chart
                    let labels = ordersDataSet.map(order => order.orderPlaced);
                    let dataAmount = ordersDataSet.map(order => order.amount);
                    let dataRunningTotal = ordersDataSet.map(order => order.runningTotal);

                    // Create an HTML table with the ordersDataSet array
                    let table = '<table>';
                    table += '<tr><th>Order Placed</th><th>Amount</th><th>Order Id</th><th>Running Total</th></tr>';
                    ordersDataSet.forEach(order => {
                        table += `<tr><td>${order.orderPlaced}</td><td>${order.amount}</td><td>${order.orderId}</td><td>${order.runningTotal}</td></tr>`;
                    });
                    table += '</table>';

                    // Add the table to the popup.html
                    document.getElementById('ordersTable').innerHTML = table;
                } catch (error) {
                    console.error('An error occurred:', error);
                }
            } else {
                console.log('No data available');
            }
        });
    }
});