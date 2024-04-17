// Load options from chrome.storage
function load_options() {
  chrome.storage.sync.get({
    options: {
      showTitle: true,
      chartTitle: '',
      showAxisLabels: true,
      showValues: true,
      showTickmarks: true,
      chartType: 'line',
      chartColor: '#000000',
      timeMeasure: 'month'
    }
  }, function(data) {
    document.getElementById('showTitle').checked = data.options.showTitle;
    document.getElementById('chartTitle').value = data.options.chartTitle;
    document.getElementById('showAxisLabels').checked = data.options.showAxisLabels;
    document.getElementById('showValues').checked = data.options.showValues;
    document.getElementById('showTickmarks').checked = data.options.showTickmarks;
    document.getElementById('chartType').value = data.options.chartType;
    document.getElementById('chartColor').value = data.options.chartColor;
    document.getElementById('timeMeasure').value = data.options.timeMeasure;
  });
}

// Event listener for DOMContentLoaded to load the options
document.addEventListener('DOMContentLoaded', load_options);

// Save options to chrome.storage
function save_options(callback) {
  var options = {
    chartType: document.getElementById('chartType').value,
    showTitle: document.getElementById('showTitle').checked,
    showAxisLabels: document.getElementById('showAxisLabels').checked,
    showTickmarks: document.getElementById('showTickmarks').checked,
    timeMeasure: document.getElementById('timeMeasure').value
  };
  chrome.storage.sync.set({
    options: options
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
    if (callback) callback(); // Call the callback function if it's provided
  });
}

// Event listener for the save button
document.getElementById('saveOptionsButton').addEventListener('click', function(e) {
  e.preventDefault(); // Prevent the form from submitting
  save_options(load_options);
});

document.getElementById('showTitle').addEventListener('change', sendOptions);
document.getElementById('showAxisLabels').addEventListener('change', sendOptions);
document.getElementById('showValues').addEventListener('change', sendOptions);
document.getElementById('showTickmarks').addEventListener('change', sendOptions);
document.getElementById('timeMeasure').addEventListener('change', sendOptions);

function sendOptions() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateOptions',
            options: {
                showTitle: document.getElementById('showTitle').checked,
                showAxisLabels: document.getElementById('showAxisLabels').checked,
                showValues: document.getElementById('showValues').checked,
                showTickmarks: document.getElementById('showTickmarks').checked,
                timeMeasure: document.getElementById('timeMeasure').value
            }
        });
    });
}

// Listen for resetButton click
document.getElementById('resetButton').addEventListener('click', function() {
  chrome.runtime.sendMessage({action: 'resetData'});
  document.getElementById('status').textContent = 'Data reset started';
});

//listen for statusUpdate messages and add to the temporary status div element
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'statusUpdate') {
    document.getElementById('statusLog').textContent = request.status;
  }
});