// Initialize empty arrays for AWS and ARG stations
let awsStations = [];
let argStations = [];

// Load and parse data from Google Sheet
async function loadStationsFromGoogleSheet() {
  const errorDiv = document.getElementById('error-message');
  errorDiv.style.display = 'none'; // Hide any previous error

  try {
    const response = await fetch('https://script.google.com/macros/s/AKfycbz-b_OiY2utpKTOANtvdQvx0MUvH59vfLM6gTOj3qxXq9WX0iJrLMbv7r6HGIhm_X-zEQ/exec'); // Replace with your deployed URL
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Raw Data from Google Sheet:', data); // Debug log

    // Process AWS data
    awsStations = data.aws && data.aws.length > 0 ? data.aws.map(row => ({
      name: row.name || '',
      province: row.province || '',
      district: row.district || '',
      sensors: parseSensors(row.sensors || ''),
      activities: parseActivities(row.activities || '').reverse()
    })) : [];
    console.log('AWS Stations:', awsStations); // Debug log

    // Process ARG data
    argStations = data.arg && data.arg.length > 0 ? data.arg.map(row => ({
      name: row.name || '',
      province: row.province || '',
      district: row.district || '',
      sensors: parseSensors(row.sensors || ''),
      activities: parseActivities(row.activities || '').reverse()
    })) : [];
    console.log('ARG Stations:', argStations); // Debug log

    if (awsStations.length === 0 || argStations.length === 0) {
      throw new Error('No data found in AWS or ARG sheets.');
    }

    populateAWSProvinces();
    populateARGProvinces();
  } catch (error) {
    console.error('Error loading data from Google Sheet:', error);
    showErrorMessage(`Error loading data: ${error.message}. Please check the console for details.`);
  }
}

// Parse sensor data (e.g., "Rain gauge Sensor,12/12/2024,31/12/2025,SN123,Good,12/12/2025")
function parseSensors(sensorData) {
  if (!sensorData) return [];
  return sensorData.split(';').map(sensor => {
    const [type, installDate, calibDate, serialNumber, status, checkedOn] = sensor.split(',');
    return { type, installDate, calibDate, serialNumber, status, checkedOn };
  });
}

// Parse activity data (e.g., "12/02/2025,Replacement of Sensor;12/07/2025,Calibration")
function parseActivities(activityData) {
  if (!activityData) return [];
  return activityData.split(';').map(activity => {
    const [date, activityDesc] = activity.split(',');
    return { date, activity: activityDesc };
  });
}

// Populate AWS provinces
function populateAWSProvinces() {
  const provinceSelect = document.getElementById('aws-province');
  provinceSelect.innerHTML = '<option value="">Select Province</option>';
  const provinces = [...new Set(awsStations.map(s => s.province))].filter(p => p); // Filter out empty provinces
  if (provinces.length === 0) {
    console.warn('No provinces found in AWS data.');
    showErrorMessage('No provinces available for AWS. Check the Google Sheet data.');
  } else {
    provinces.forEach(province => {
      const option = document.createElement('option');
      option.value = province;
      option.textContent = province;
      provinceSelect.appendChild(option);
    });
  }
}

// Update AWS options (districts or stations)
function updateAWSOptions(level) {
  const province = document.getElementById('aws-province').value;
  const districtSelect = document.getElementById('aws-district');
  const stationSelect = document.getElementById('aws-station');

  // Only reset the current level and below
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
    const validProvince = awsStations.some(s => s.province === province);
    if (!validProvince) {
      console.warn(`Province "${province}" not found in AWS data.`);
      districtSelect.disabled = true;
      showErrorMessage(`Province "${province}" not found in AWS data.`);
      return;
    }

    districtSelect.disabled = false;
    if (level === 'district') {
      const districts = [...new Set(awsStations.filter(s => s.province === province).map(s => s.district))].filter(d => d);
      if (districts.length === 0) {
        console.warn(`No districts found for province ${province} in AWS data.`);
        showErrorMessage(`No districts available for province ${province} in AWS.`);
      } else {
        districts.forEach(district => {
          const option = document.createElement('option');
          option.value = district;
          option.textContent = district;
          districtSelect.appendChild(option);
        });
      }
    } else if (level === 'station') {
      const district = districtSelect.value;
      console.log(`Filtering stations for province: ${province}, district: ${district}`);
      if (district) {
        const filteredStations = awsStations
          .filter(s => s.province === province && s.district === district)
          .map(s => s.name)
          .filter(s => s);
        console.log('Filtered Stations:', filteredStations);
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        if (filteredStations.length === 0) {
          console.warn(`No stations found for district ${district} in province ${province}.`);
          showErrorMessage(`No stations available for district ${district} in province ${province}.`);
        } else {
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

// Populate ARG provinces
function populateARGProvinces() {
  const provinceSelect = document.getElementById('arg-province');
  provinceSelect.innerHTML = '<option value="">Select Province</option>';
  const provinces = [...new Set(argStations.map(s => s.province))].filter(p => p); // Filter out empty provinces
  if (provinces.length === 0) {
    console.warn('No provinces found in ARG data.');
    showErrorMessage('No provinces available for ARG. Check the Google Sheet data.');
  } else {
    provinces.forEach(province => {
      const option = document.createElement('option');
      option.value = province;
      option.textContent = province;
      provinceSelect.appendChild(option);
    });
  }
}

// Update ARG options (districts or stations)
function updateARGOptions(level) {
  const province = document.getElementById('arg-province').value;
  const districtSelect = document.getElementById('arg-district');
  const stationSelect = document.getElementById('arg-station');

  // Only reset the current level and below
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
    const validProvince = argStations.some(s => s.province === province);
    if (!validProvince) {
      console.warn(`Province "${province}" not found in ARG data.`);
      districtSelect.disabled = true;
      showErrorMessage(`Province "${province}" not found in ARG data.`);
      return;
    }

    districtSelect.disabled = false;
    if (level === 'district') {
      const districts = [...new Set(argStations.filter(s => s.province === province).map(s => s.district))].filter(d => d);
      if (districts.length === 0) {
        console.warn(`No districts found for province ${province} in ARG data.`);
        showErrorMessage(`No districts available for province ${province} in ARG.`);
      } else {
        districts.forEach(district => {
          const option = document.createElement('option');
          option.value = district;
          option.textContent = district;
          districtSelect.appendChild(option);
        });
      }
    } else if (level === 'station') {
      const district = districtSelect.value;
      console.log(`Filtering stations for province: ${province}, district: ${district}`);
      if (district) {
        const filteredStations = argStations
          .filter(s => s.province === province && s.district === district)
          .map(s => s.name)
          .filter(s => s);
        console.log('Filtered Stations:', filteredStations);
        stationSelect.innerHTML = '<option value="">Select Station</option>';
        if (filteredStations.length === 0) {
          console.warn(`No stations found for district ${district} in province ${province}.`);
          showErrorMessage(`No stations available for district ${district} in province ${province}.`);
        } else {
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

// Display AWS station information
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
    detailsDiv.style.display = 'block';
    sensorTable.style.display = 'table';
    activityTable.style.display = 'table';

    if (station.sensors.length > 0) {
      station.sensors.forEach(sensor => {
        const row = document.createElement('tr');
        const statusClass = sensor.status === 'SUSPECTED' ? 'suspected' : '';
        row.innerHTML = `
          <td>${sensor.type || 'N/A'}</td>
          <td>${sensor.installDate || 'N/A'}</td>
          <td>${sensor.calibDate || 'N/A'}</td>
          <td>${sensor.serialNumber || 'N/A'}</td>
          <td class="${statusClass}">${sensor.status || 'N/A'}</td>
          <td>${sensor.checkedOn || 'N/A'}</td>
        `;
        sensorTableBody.appendChild(row);
      });
    } else {
      sensorTableBody.innerHTML = '<tr><td colspan="6" class="no-data">No sensors available</td></tr>';
    }

    if (station.activities.length > 0) {
      station.activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${activity.date || 'N/A'}</td>
          <td>${activity.activity || 'N/A'}</td>
        `;
        activityTableBody.appendChild(row);
      });
    } else {
      activityTableBody.innerHTML = '<tr><td colspan="2" class="no-data">No activities available</td></tr>';
    }
  } else if (stationName) {
    showErrorMessage(`Station "${stationName}" not found in AWS data.`);
  }
}

// Display ARG station information
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
    detailsDiv.style.display = 'block';
    sensorTable.style.display = 'table';
    activityTable.style.display = 'table';

    if (station.sensors.length > 0) {
      station.sensors.forEach(sensor => {
        const row = document.createElement('tr');
        const statusClass = sensor.status === 'SUSPECTED' ? 'suspected' : '';
        row.innerHTML = `
          <td>${sensor.type || 'N/A'}</td>
          <td>${sensor.installDate || 'N/A'}</td>
          <td>${sensor.calibDate || 'N/A'}</td>
          <td>${sensor.serialNumber || 'N/A'}</td>
          <td class="${statusClass}">${sensor.status || 'N/A'}</td>
          <td>${sensor.checkedOn || 'N/A'}</td>
        `;
        sensorTableBody.appendChild(row);
      });
    } else {
      sensorTableBody.innerHTML = '<tr><td colspan="6" class="no-data">No sensors available</td></tr>';
    }

    if (station.activities.length > 0) {
      station.activities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${activity.date || 'N/A'}</td>
          <td>${activity.activity || 'N/A'}</td>
        `;
        activityTableBody.appendChild(row);
      });
    } else {
      activityTableBody.innerHTML = '<tr><td colspan="2" class="no-data">No activities available</td></tr>';
    }
  } else if (stationName) {
    showErrorMessage(`Station "${stationName}" not found in ARG data.`);
  }
}

// Clear AWS station information
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

// Clear ARG station information
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

// Initialize on page load
window.onload = async function() {
  await loadStationsFromGoogleSheet();
};