// content.js is a JavaScript file that runs in the content script of your Chrome extension.
let ordersDataSet = [];

// Function to extract data from a page
async function extractDataFromPage(pageNumber) {
    chrome.runtime.sendMessage({action: 'updateStatus', status: 'Data extraction started.'});
    // Make a request to the page
    try {
        response = await fetch(`https://robertsspaceindustries.com/account/billing?page=${pageNumber}&pagesize=100`);
    } catch (error) {
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Billing pages request failed: ' + error.message});
        throw error;
    }

    let text = await response.text();

    // Parse the HTML of the page
    let parser = new DOMParser();
    let doc = parser.parseFromString(text, 'text/html');

    // Extract the data from the page
    // Select all list item elements within unordered list elements with the class "orders-item"
    let ordersItems = doc.querySelectorAll('ul.orders-item li');

    // Initialize an array to hold the extracted data
    let ordersData = [];

    // Regular expressions for the three criteria
    let orderPlacedRegex = /Order Placed:\s*([^]*?)\n/;
    let amountRegex = /Amount:\s*\$(\d+(\.\d{2})?)/;
    let orderIdRegex = /Order Id:\s*(\w+)/;

    // Initialize a running total
    let runningTotal = 0;

    // Loop through the selected elements
    ordersItems.forEach((item) => {
        // Extract the text content of the element
        let text = item.textContent.trim();
        // Try to match the three criteria
        let orderPlacedMatch = text.match(orderPlacedRegex);
        let amountMatch = text.match(amountRegex);
        let orderIdMatch = text.match(orderIdRegex);
        
        // If all three criteria were matched, add the data to the array
        if (orderPlacedMatch && amountMatch && orderIdMatch) {
            // Convert the date and amount to their appropriate types
            let orderPlaced = new Date(orderPlacedMatch[1]);
            let amount = parseFloat(amountMatch[1]);
            // Update the running total
            runningTotal += amount;
            // Add the data to the array
            ordersData.push({
                orderPlaced: orderPlaced,
                amount: amount,
                orderId: orderIdMatch[1],
                runningTotal: runningTotal
            });
        }
    }); // End of forEach
    // Check if there is a next page
    let nextPageLink = doc.querySelector('a[href^="https://robertsspaceindustries.com/account/billing?page="]');
    if (nextPageLink) {
        // Extract the page number from the next page link
        let nextPageNumber = nextPageLink.href.match(/page=(\d+)/)[1];
        // Recursively call this function to extract data from the next page
        let nextPageData = await extractDataFromPage(nextPageNumber);
        // Concatenate the nextPageData to the ordersData array
        return ordersData.concat(nextPageData);
    } else {
        // If there is no next page, return the extracted data
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Last page reached.'});
        return ordersData;
        
    }
    }
    extractDataFromPage(1)
        .then((ordersData) => {
            // append the extracted data into the ordersDataSet
            ordersDataSet = ordersDataSet.concat(ordersData);
            // send the dataExtractionCompleted message to the popup script
            chrome.runtime.sendMessage({action: 'dataExtractionCompleted', ordersDataSet: ordersDataSet});
        })
        .catch(error => {
            console.error('An error occurred:', error);
        });

    // createModal is a message handler that creates a modal with a chart.
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'createModal') {
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Creating modal.'});
        // Create the modal
        var modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100vh';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Modal created.'});

        // Create the modal content
        var modalContent = document.createElement('div');
        modalContent.style.width = '80vw';
        modalContent.style.Maxheight = '80vh';
        modalContent.style.display = 'flex';
        modalContent.style.flexDirection = 'column';
        modalContent.style.alignItems = 'center';
        modalContent.style.justifyContent = 'center';
        modalContent.style.overflow = 'auto';
        modalContent.style.backgroundColor = '#ffffff';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '10px';
        modalContent.style.position = 'relative';
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Modal content created.'});

        // Create a close button in the top right of the content
        var closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '10px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '18px';
        closeButton.style.fontWeight = 'bold';
        closeButton.addEventListener('click', function() {
            if (document.body.contains(modal)) {
            document.body.removeChild(modal);
            }
        });
        modalContent.appendChild(closeButton);
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Close button created.'});

        // Create a canvas for the chart
        var canvas = document.createElement('canvas');
        canvas.id = 'myChart';
        canvas.width = '100%';
        canvas.height = '100%';
        modalContent.appendChild(canvas);
        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Canvas created.'});
        modal.appendChild(modalContent);
        
        // Append the modal to the body
        document.body.appendChild(modal);

        // Prepare the data for the chart
        let labels = request.ordersDataSet.map(order => order.orderPlaced);
        let dataAmount = request.ordersDataSet.map(order => order.amount);
        let dataRunningTotal = request.ordersDataSet.map(order => order.runningTotal);

        // Create the chart
        chrome.runtime.sendMessage({action: 'injectChartjs'}, (response) => {
            if (response && response.success) {
                // Wait for Chartjs to load
                setTimeout(() => {
                    chrome.runtime.sendMessage({action: 'updateStatus', status: 'Chartjs loaded.'});
                    // Check if there's data
                    if (!labels || !dataAmount || !dataRunningTotal) {
                        chrome.runtime.sendMessage({action: 'updateStatus', status: 'Failed to create chart: data not found.'});
                        return;
                    }
                    // Log the dataset to the console
                    console.log(request.ordersDataSet);
                    // Create the chart
                    var ctx = document.getElementById('myChart').getContext('2d');
                    var chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Amount',
                                data: dataAmount,
                                borderColor: 'rgb(75, 192, 192)',
                                fill: false
                            }, {
                                label: 'Running Total',
                                data: dataRunningTotal,
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false
                            }]
                        },
                        options: {
                            responsive: true,
                            title: {
                                display: true,
                                text: 'Order Data'
                            },
                            tooltips: {
                                mode: 'index',
                                intersect: false,
                            },
                            hover: {
                                mode: 'nearest',
                                intersect: true
                            },
                            scales: {
                                x: {
                                    type: 'time',
                                    display: true,
                                    title: {
                                        display: true,
                                        text: 'Order Placed'
                                    },
                                    time: {
                                        unit: 'month'
                                    }
                                },
                                y: {
                                    type: 'linear',
                                    display: true,
                                    title: {
                                        display: true,
                                        text: 'Value'
                                    },
                                    beginAtZero: true
                                },
                            },
                            animation: {
                                onComplete: function() {
                                chrome.runtime.sendMessage({action: 'updateStatus', status: 'Chart animation completed.'});
                                }
                            }
                        }
                    });
                    // Send a status update after the chart has been created
                    chrome.runtime.sendMessage({action: 'updateStatus', status: 'Chart created.'})
                }, 1000);
            } else {
                chrome.runtime.sendMessage({action: 'updateStatus', status: 'Failed to load Chartjs.'});
            }
    });
    }
});