// Global variables
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbywI-yZRAyqbEoVLxhj5-qnPvEoTfqwRuv38_nL_6wxrg3AKQjVzsi0hEvaGAZqEAVZtw/exec';
let awsStations = [];
let argStations = [];

// Global load function
async function loadGoogleSheetData() {
    try {
        console.log('Attempting to fetch data from:', APPS_SCRIPT_URL);
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            redirect: 'follow',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        console.log('Response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Parsed JSON data:', data);

        if (data.error) {
            console.error('Apps Script returned an error:', data.error);
            alert(`Apps Script error: ${data.error}`);
            return [];
        }

        if (!data.dataRequests || !Array.isArray(data.dataRequests)) {
            console.warn('dataRequests is missing or not an array:', data.dataRequests);
            alert('Invalid data format: dataRequests is missing or not an array');
            return [];
        }

        console.log('Data requests:', data.dataRequests);
        return data.dataRequests;
    } catch (error) {
        console.error('Error fetching Apps Script data:', error.message);
        console.error('Full error details:', error);
        alert(`Failed to load data from Google Sheet: ${error.message}`);
        return [];
    }
}

// Global load stations
async function loadStationsFromExcel() {
    try {
        const rawData = await loadGoogleSheetData();
        if (rawData.length === 0) {
            console.warn('No data loaded from Google Sheet');
            alert('No data available from Google Sheet');
            return;
        }

        awsStations = rawData
            .filter(row => row.type === 'AWS' || !row.type)
            .map(row => ({
                name: row.name || row[0] || 'N/A',
                province: row.province || row[1] || 'N/A',
                district: row.district || row[2] || 'N/A',
                sensors: parseSensors(row.sensors || row[3] || ''),
                activities: parseActivities(row.activities || row[4] || '').reverse()
            }));
        console.log('AWS Stations:', awsStations);
        populateAWSProvinces();

        argStations = rawData
            .filter(row => row.type === 'ARG')
            .map(row => ({
                name: row.name || row[0] || 'N/A',
                province: row.province || row[1] || 'N/A',
                district: row.district || row[2] || 'N/A',
                sensors: parseSensors(row.sensors || row[3] || ''),
                activities: parseActivities(row.activities || row[4] || '').reverse()
            }));
        console.log('ARG Stations:', argStations);
        populateARGProvinces();
    } catch (error) {
        console.error('Error processing stations from Google Sheet:', error.message);
        alert(`Error processing data: ${error.message}`);
    }
}

// Global parse functions
function parseSensors(sensorData) {
    if (!sensorData) return [];
    return sensorData.split(';').map(sensor => {
        const parts = sensor.split(',');
        return { 
            type: parts[0] || '', 
            installDate: parts[1] || '', 
            calibDate: parts[2] || '', 
            serialNumber: parts[3] || '', 
            status: parts[4] || '', 
            checkedOn: parts[5] || '' 
        };
    }).filter(s => s.type.trim());
}

function parseActivities(activityData) {
    if (!activityData) return [];
    return activityData.split(';').map(activity => {
        const parts = activity.split(',');
        return { 
            date: parts[0] || '', 
            activity: parts[1] || '' 
        };
    }).filter(a => a.date.trim());
}

// Global serialize functions
function serializeSensors(sensors) {
    return sensors.map(s => 
        [s.type, s.installDate, s.calibDate, s.serialNumber, s.status, s.checkedOn]
        .filter(val => val && val.trim() !== '')
        .join(',')
    ).filter(str => str.length > 0).join(';');
}

function serializeActivities(activities) {
    return activities.map(a => 
        [a.date, a.activity]
        .filter(val => val && val.trim() !== '')
        .join(',')
    ).filter(str => str.length > 0).join(';');
}

// Global update memory
function updateStationData(stationType, stationName, sensors, activities) {
    let stations = stationType === 'aws' ? awsStations : argStations;
    const stationIndex = stations.findIndex(s => s.name === stationName);
    if (stationIndex !== -1) {
        stations[stationIndex].sensors = sensors;
        stations[stationIndex].activities = activities.reverse();
        console.log('Updated memory for', stationType, stationName);
        return true;
    }
    return false;
}

// Global save function
async function saveToGoogleSheets(stationType, stationName, sensors, activities) {
    try {
        let stations = stationType === 'aws' ? awsStations : argStations;
        const station = stations.find(s => s.name === stationName);
        if (!station) {
            throw new Error('Station not found');
        }

        const payload = {
            action: 'update',
            type: stationType.toUpperCase(),
            name: stationName,
            province: station.province,
            district: station.district,
            sensors: serializeSensors(sensors),
            activities: serializeActivities(activities)
        };

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, ${errorText}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        console.log('Data saved successfully:', result);
        return true;
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        alert(`Failed to save data: ${error.message}`);
        return false;
    }
}

// Global populate functions
function populateAWSProvinces() {
    const provinceSelect = document.getElementById('aws-province');
    provinceSelect.innerHTML = '<option value="">Select Province</option>';
    const provinces = [...new Set(awsStations.map(s => s.province).filter(p => p !== 'N/A'))];
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
    });
}

function updateAWSOptions(level) {
    const province = document.getElementById('aws-province').value;
    const districtSelect = document.getElementById('aws-district');
    const stationSelect = document.getElementById('aws-station');

    if (level === 'district') {
        districtSelect.innerHTML = '<option value="">Select District</option>';
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        stationSelect.disabled = true;
        clearAWSStationInfo();
    } else if (level === 'station') {
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        clearAWSStationInfo();
    }

    if (province) {
        districtSelect.disabled = false;
        if (level === 'district') {
            const districts = [...new Set(awsStations.filter(s => s.province === province).map(s => s.district).filter(d => d !== 'N/A'))];
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } else if (level === 'station') {
            const district = districtSelect.value;
            if (district) {
                const filteredStations = awsStations
                    .filter(s => s.province === province && s.district === district)
                    .map(s => s.name)
                    .filter(n => n !== 'N/A');
                stationSelect.innerHTML = '<option value="">Select Station</option>';
                if (filteredStations.length > 0) {
                    filteredStations.forEach(station => {
                        const option = document.createElement('option');
                        option.value = station;
                        option.textContent = station;
                        stationSelect.appendChild(option);
                    });
                    stationSelect.disabled = false;
                }
            }
        }
    }
}

function populateARGProvinces() {
    const provinceSelect = document.getElementById('arg-province');
    provinceSelect.innerHTML = '<option value="">Select Province</option>';
    const provinces = [...new Set(argStations.map(s => s.province).filter(p => p !== 'N/A'))];
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceSelect.appendChild(option);
    });
}

function updateARGOptions(level) {
    const province = document.getElementById('arg-province').value;
    const districtSelect = document.getElementById('arg-district');
    const stationSelect = document.getElementById('arg-station');

    if (level === 'district') {
        districtSelect.innerHTML = '<option value="">Select District</option>';
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        stationSelect.disabled = true;
        clearARGStationInfo();
    } else if (level === 'station') {
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        clearARGStationInfo();
    }

    if (province) {
        districtSelect.disabled = false;
        if (level === 'district') {
            const districts = [...new Set(argStations.filter(s => s.province === province).map(s => s.district).filter(d => d !== 'N/A'))];
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } else if (level === 'station') {
            const district = districtSelect.value;
            if (district) {
                const filteredStations = argStations
                    .filter(s => s.province === province && s.district === district)
                    .map(s => s.name)
                    .filter(n => n !== 'N/A');
                stationSelect.innerHTML = '<option value="">Select Station</option>';
                if (filteredStations.length > 0) {
                    filteredStations.forEach(station => {
                        const option = document.createElement('option');
                        option.value = station;
                        option.textContent = station;
                        stationSelect.appendChild(option);
                    });
                    stationSelect.disabled = false;
                }
            }
        }
    }
}

// Global display functions (with fixed row declaration and escaping)
function displayAWSStationInfo() {
    const stationName = document.getElementById('aws-station').value;
    const station = awsStations.find(s => s.name === stationName);
    const detailsDiv = document.getElementById('aws-station-details');
    const sensorTable = document.getElementById('aws-sensor-table');
    const activityTable = document.getElementById('aws-activity-table');
    const sensorTableBody = sensorTable.getElementsByTagName('tbody')[0];
    const activityTableBody = activityTable.getElementsByTagName('tbody')[0];

    clearAWSStationInfo();

    if (station) {
        console.log('Rendering AWS station:', stationName, 'with sensors:', station.sensors.length, 'activities:', station.activities.length);
        detailsDiv.style.display = 'block';
        sensorTable.style.display = 'table';
        activityTable.style.display = 'table';

        // Display sensors
        if (station.sensors && station.sensors.length > 0) {
            station.sensors.forEach((sensor, index) => {
                const safeStationName = station.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const statusClass = sensor.status === 'SUSPECTED' ? 'suspected' : '';
                const safeSensorStr = JSON.stringify(sensor).replace(/"/g, '&quot;');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sensor.type || 'N/A'}</td>
                    <td>${sensor.installDate || 'N/A'}</td>
                    <td>${sensor.calibDate || 'N/A'}</td>
                    <td>${sensor.serialNumber || 'N/A'}</td>
                    <td class="${statusClass}">${sensor.status || 'N/A'}</td>
                    <td>${sensor.checkedOn || 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="openEditSensorModal('aws', '${safeStationName}', ${safeSensorStr}, ${index})">Edit</button>
                        <button class="delete-btn" onclick="deleteSensor('aws', '${safeStationName}', ${index})">Delete</button>
                    </td>
                `;
                sensorTableBody.appendChild(row);
                console.log('Added sensor row with buttons for index:', index);
            });
        } else {
            sensorTableBody.innerHTML = '<tr><td colspan="7" class="no-data">No sensors defined</td></tr>';
        }

        // Display activities
        if (station.activities && station.activities.length > 0) {
            station.activities.forEach((activity, index) => {
                const safeStationName = station.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const safeActivityStr = JSON.stringify(activity).replace(/"/g, '&quot;');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${activity.date || 'N/A'}</td>
                    <td>${activity.activity || 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="openEditActivityModal('aws', '${safeStationName}', ${safeActivityStr}, ${index})">Edit</button>
                        <button class="delete-btn" onclick="deleteActivity('aws', '${safeStationName}', ${index})">Delete</button>
                    </td>
                `;
                activityTableBody.appendChild(row);
                console.log('Added activity row with buttons for index:', index);
            });
        } else {
            activityTableBody.innerHTML = '<tr><td colspan="3" class="no-data">No activities available</td></tr>';
        }
    } else {
        console.warn('No AWS station found for name:', stationName);
    }
}

function displayARGStationInfo() {
    const stationName = document.getElementById('arg-station').value;
    const station = argStations.find(s => s.name === stationName);
    const detailsDiv = document.getElementById('arg-station-details');
    const sensorTable = document.getElementById('arg-sensor-table');
    const activityTable = document.getElementById('arg-activity-table');
    const sensorTableBody = sensorTable.getElementsByTagName('tbody')[0];
    const activityTableBody = activityTable.getElementsByTagName('tbody')[0];

    clearARGStationInfo();

    if (station) {
        console.log('Rendering ARG station:', stationName, 'with sensors:', station.sensors.length, 'activities:', station.activities.length);
        detailsDiv.style.display = 'block';
        sensorTable.style.display = 'table';
        activityTable.style.display = 'table';

        // Display sensors
        if (station.sensors && station.sensors.length > 0) {
            station.sensors.forEach((sensor, index) => {
                const safeStationName = station.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const statusClass = sensor.status === 'SUSPECTED' ? 'suspected' : '';
                const safeSensorStr = JSON.stringify(sensor).replace(/"/g, '&quot;');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sensor.type || 'N/A'}</td>
                    <td>${sensor.installDate || 'N/A'}</td>
                    <td>${sensor.calibDate || 'N/A'}</td>
                    <td>${sensor.serialNumber || 'N/A'}</td>
                    <td class="${statusClass}">${sensor.status || 'N/A'}</td>
                    <td>${sensor.checkedOn || 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="openEditSensorModal('arg', '${safeStationName}', ${safeSensorStr}, ${index})">Edit</button>
                        <button class="delete-btn" onclick="deleteSensor('arg', '${safeStationName}', ${index})">Delete</button>
                    </td>
                `;
                sensorTableBody.appendChild(row);
                console.log('Added sensor row with buttons for index:', index);
            });
        } else {
            sensorTableBody.innerHTML = '<tr><td colspan="7" class="no-data">No sensors defined</td></tr>';
        }

        // Display activities
        if (station.activities && station.activities.length > 0) {
            station.activities.forEach((activity, index) => {
                const safeStationName = station.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const safeActivityStr = JSON.stringify(activity).replace(/"/g, '&quot;');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${activity.date || 'N/A'}</td>
                    <td>${activity.activity || 'N/A'}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" onclick="openEditActivityModal('arg', '${safeStationName}', ${safeActivityStr}, ${index})">Edit</button>
                        <button class="delete-btn" onclick="deleteActivity('arg', '${safeStationName}', ${index})">Delete</button>
                    </td>
                `;
                activityTableBody.appendChild(row);
                console.log('Added activity row with buttons for index:', index);
            });
        } else {
            activityTableBody.innerHTML = '<tr><td colspan="3" class="no-data">No activities available</td></tr>';
        }
    } else {
        console.warn('No ARG station found for name:', stationName);
    }
}

// Global clear functions
function clearAWSStationInfo() {
    const detailsDiv = document.getElementById('aws-station-details');
    const sensorTable = document.getElementById('aws-sensor-table');
    const activityTable = document.getElementById('aws-activity-table');
    detailsDiv.style.display = 'none';
    sensorTable.style.display = 'none';
    activityTable.style.display = 'none';
    sensorTable.getElementsByTagName('tbody')[0].innerHTML = '';
    activityTable.getElementsByTagName('tbody')[0].innerHTML = '';
}

function clearARGStationInfo() {
    const detailsDiv = document.getElementById('arg-station-details');
    const sensorTable = document.getElementById('arg-sensor-table');
    const activityTable = document.getElementById('arg-activity-table');
    detailsDiv.style.display = 'none';
    sensorTable.style.display = 'none';
    activityTable.style.display = 'none';
    sensorTable.getElementsByTagName('tbody')[0].innerHTML = '';
    activityTable.getElementsByTagName('tbody')[0].innerHTML = '';
}

// Global delete functions
async function deleteSensor(stationType, stationName, sensorIndex) {
    if (!confirm('Are you sure you want to delete this sensor?')) return;

    let stations = stationType === 'aws' ? awsStations : argStations;
    const station = stations.find(s => s.name === stationName);
    
    if (station && station.sensors[sensorIndex]) {
        station.sensors.splice(sensorIndex, 1);
        updateStationData(stationType, stationName, station.sensors, station.activities);
        const success = await saveToGoogleSheets(stationType, stationName, station.sensors, station.activities);
        
        if (success) {
            console.log('Sensor deleted successfully');
            if (stationType === 'aws') displayAWSStationInfo();
            else displayARGStationInfo();
            alert('Sensor deleted successfully');
        }
    }
}

async function deleteActivity(stationType, stationName, activityIndex) {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    let stations = stationType === 'aws' ? awsStations : argStations;
    const station = stations.find(s => s.name === stationName);
    
    if (station && station.activities[activityIndex]) {
        station.activities.splice(activityIndex, 1);
        updateStationData(stationType, stationName, station.sensors, station.activities);
        const success = await saveToGoogleSheets(stationType, stationName, station.sensors, station.activities);
        
        if (success) {
            console.log('Activity deleted successfully');
            if (stationType === 'aws') displayAWSStationInfo();
            else displayARGStationInfo();
            alert('Activity deleted successfully');
        }
    }
}

// Global form handlers (attached on DOMContentLoaded)
document.addEventListener('DOMContentLoaded', function() {
    // Sensor form
    document.getElementById('sensorForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const isEdit = document.getElementById('sensorId').value !== '';
        const stationType = document.getElementById('sensorStationType').value;
        const stationName = document.getElementById('sensorStationName').value;
        
        if (!stationName) {
            alert('Please select a station first');
            return;
        }
        
        const sensorData = {
            type: document.getElementById('sensorType').value,
            installDate: document.getElementById('installDate').value,
            calibDate: document.getElementById('calibDate').value,
            serialNumber: document.getElementById('serialNumber').value,
            status: document.getElementById('sensorStatus').value,
            checkedOn: document.getElementById('checkedOn').value
        };
        
        let stations = stationType === 'aws' ? awsStations : argStations;
        const station = stations.find(s => s.name === stationName);
        
        if (!station) {
            alert('Station not found');
            return;
        }
        
        let sensors = [...station.sensors];
        
        if (isEdit) {
            const index = parseInt(document.getElementById('sensorId').value);
            sensors[index] = sensorData;
        } else {
            sensors.push(sensorData);
        }
        
        updateStationData(stationType, stationName, sensors, station.activities);
        const success = await saveToGoogleSheets(stationType, stationName, sensors, station.activities);
        
        if (success) {
            closeModal('sensorModal');
            console.log(isEdit ? 'Sensor updated successfully' : 'Sensor added successfully');
            if (stationType === 'aws') displayAWSStationInfo();
            else displayARGStationInfo();
            alert(isEdit ? 'Sensor updated successfully' : 'Sensor added successfully');
        }
    });
    
    // Activity form
    document.getElementById('activityForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const isEdit = document.getElementById('activityId').value !== '';
        const stationType = document.getElementById('activityStationType').value;
        const stationName = document.getElementById('activityStationName').value;
        
        if (!stationName) {
            alert('Please select a station first');
            return;
        }
        
        const activityData = {
            date: document.getElementById('activityDate').value,
            activity: document.getElementById('activityDesc').value
        };
        
        let stations = stationType === 'aws' ? awsStations : argStations;
        const station = stations.find(s => s.name === stationName);
        
        if (!station) {
            alert('Station not found');
            return;
        }
        
        let activities = [...station.activities];
        
        if (isEdit) {
            const index = parseInt(document.getElementById('activityId').value);
            activities[index] = activityData;
        } else {
            activities.push(activityData);
        }
        
        updateStationData(stationType, stationName, station.sensors, activities);
        const success = await saveToGoogleSheets(stationType, stationName, station.sensors, activities);
        
        if (success) {
            closeModal('activityModal');
            console.log(isEdit ? 'Activity updated successfully' : 'Activity added successfully');
            if (stationType === 'aws') displayAWSStationInfo();
            else displayARGStationInfo();
            alert(isEdit ? 'Activity updated successfully' : 'Activity added successfully');
        }
    });
});

// Global init
window.onload = async function() {
    await loadStationsFromExcel();
};