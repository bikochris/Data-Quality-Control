
        // Apps Script web app URL
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz6xtA3wvDVC01Or9WrWLtzrwmjT51luN0dDPyCH5-eC5BA-FZL3kM_ewh7JtwCM9NK4w/exec';

        async function loadGoogleSheetData() {
            try {
                console.log('Attempting to fetch data from:', APPS_SCRIPT_URL);
                const response = await fetch(APPS_SCRIPT_URL, {
                    method: 'GET',
                    mode: 'cors',
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

        // Initialize empty arrays for AWS and ARG stations
        let awsStations = [];
        let argStations = [];

        // Load and parse data from Google Sheet (JSON format)
        async function loadStationsFromExcel() {
            try {
                const rawData = await loadGoogleSheetData();
                if (rawData.length === 0) {
                    console.warn('No data loaded from Google Sheet');
                    alert('No data available from Google Sheet');
                    return;
                }

                // Assuming rawData contains objects with a 'type' field to distinguish AWS/ARG
                // Adjust based on your actual data structure (e.g., if separate arrays like data.awsData)
                awsStations = rawData
                    .filter(row => row.type === 'AWS' || !row.type) // Fallback if type is missing
                    .map(row => ({
                        name: row.name || row[0] || 'N/A', // Support object or array access
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

        // Parse sensor data (e.g., "Rain gauge Sensor,12/12/2024,31/12/2025,SN123,Good,12/12/2025")
        function parseSensors(sensorData) {
            if (!sensorData) return [];
            return sensorData.split(';').map(sensor => {
                const [type, installDate, calibDate, serialNumber, status, checkedOn] = sensor.split(',');
                return { type, installDate, calibDate, serialNumber, status, checkedOn };
            }).filter(s => s.type); // Filter out empty parses
        }

        // Parse activity data (e.g., "12/02/2025,Replacement of Sensor;12/07/2025,Calibration")
        function parseActivities(activityData) {
            if (!activityData) return [];
            return activityData.split(';').map(activity => {
                const [date, activityDesc] = activity.split(',');
                return { date, activity: activityDesc };
            }).filter(a => a.date); // Filter out empty parses
        }

        // Populate AWS provinces
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
                    return;
                }

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
                    console.log(`Filtering stations for province: ${province}, district: ${district}`);
                    if (district) {
                        const filteredStations = awsStations
                            .filter(s => s.province === province && s.district === district)
                            .map(s => s.name)
                            .filter(n => n !== 'N/A');
                        console.log('Filtered Stations:', filteredStations);
                        stationSelect.innerHTML = '<option value="">Select Station</option>';
                        if (filteredStations.length > 0) {
                            filteredStations.forEach(station => {
                                const option = document.createElement('option');
                                option.value = station;
                                option.textContent = station;
                                stationSelect.appendChild(option);
                            });
                            stationSelect.disabled = false;
                        } else {
                            console.warn(`No stations found for district ${district} in province ${province}.`);
                        }
                    }
                }
            }
        }

        // Populate ARG provinces
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
                    return;
                }

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
                    console.log(`Filtering stations for province: ${province}, district: ${district}`);
                    if (district) {
                        const filteredStations = argStations
                            .filter(s => s.province === province && s.district === district)
                            .map(s => s.name)
                            .filter(n => n !== 'N/A');
                        console.log('Filtered Stations:', filteredStations);
                        stationSelect.innerHTML = '<option value="">Select Station</option>';
                        if (filteredStations.length > 0) {
                            filteredStations.forEach(station => {
                                const option = document.createElement('option');
                                option.value = station;
                                option.textContent = station;
                                stationSelect.appendChild(option);
                            });
                            stationSelect.disabled = false;
                        } else {
                            console.warn(`No stations found for district ${district} in province ${province}.`);
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
      sensorTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Not Yet Defined</td></tr>';
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
      sensorTableBody.innerHTML = '<tr><td colspan="6" class="no-data">Not Yet Defined</td></tr>';
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
  await loadStationsFromExcel();
};