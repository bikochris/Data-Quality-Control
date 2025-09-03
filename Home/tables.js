 // Initialize empty arrays for AWS and ARG stations
    let awsStations = [];
    let argStations = [];

    // Load and parse AWS CSV file
    async function loadAWSStationsFromCSV() {
      try {
        const response = await fetch('aws_stations.csv');
        const text = await response.text();
        const data = Papa.parse(text, { header: true }).data;
        awsStations = data.map(row => ({
          name: row.name,
          province: row.province,
          district: row.district,
          sensors: JSON.parse(row.sensors || '[]'),
          activities: JSON.parse(row.activities || '[]')
        }));
        populateAWSProvinces();
      } catch (error) {
        console.error('Error loading aws_stations.csv:', error);
      }
    }

    // Load and parse ARG CSV file
    async function loadARGStationsFromCSV() {
      try {
        const response = await fetch('arg_stations.csv');
        const text = await response.text();
        const data = Papa.parse(text, { header: true }).data;
        argStations = data.map(row => ({
          name: row.name,
          province: row.province,
          district: row.district,
          sensors: JSON.parse(row.sensors || '[]'),
          activities: JSON.parse(row.activities || '[]')
        }));
        populateARGProvinces();
      } catch (error) {
        console.error('Error loading arg_stations.csv:', error);
      }
    }

    // Populate AWS provinces
    function populateAWSProvinces() {
      const provinceSelect = document.getElementById('aws-province');
      const provinces = [...new Set(awsStations.map(s => s.province))];
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
      districtSelect.disabled = !province || level !== 'district';
      stationSelect.disabled = true;
      clearAWSStationInfo();

      if (province) {
        if (level === 'district') {
          districtSelect.innerHTML = '<option value="">Select District</option>';
          const districts = [...new Set(awsStations
            .filter(s => s.province === province)
            .map(s => s.district))];
          districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
          });
        } else if (level === 'station') {
          const district = districtSelect.value;
          stationSelect.innerHTML = '<option value="">Select Station</option>';
          if (district) {
            const filteredStations = awsStations
              .filter(s => s.province === province && s.district === district)
              .map(s => s.name);
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

    // Populate ARG provinces
    function populateARGProvinces() {
      const provinceSelect = document.getElementById('arg-province');
      const provinces = [...new Set(argStations.map(s => s.province))];
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
      districtSelect.disabled = !province || level !== 'district';
      stationSelect.disabled = true;
      clearARGStationInfo();

      if (province) {
        if (level === 'district') {
          districtSelect.innerHTML = '<option value="">Select District</option>';
          const districts = [...new Set(argStations
            .filter(s => s.province === province)
            .map(s => s.district))];
          districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
          });
        } else if (level === 'station') {
          const district = districtSelect.value;
          stationSelect.innerHTML = '<option value="">Select Station</option>';
          if (district) {
            const filteredStations = argStations
              .filter(s => s.province === province && s.district === district)
              .map(s => s.name);
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
              <td>${sensor.type}</td>
              <td class="${statusClass}">${sensor.status}</td>
              <td>${sensor.checkedOn || 'N/A'}</td>
            `;
            sensorTableBody.appendChild(row);
          });
        } else {
          sensorTableBody.innerHTML = '<tr><td colspan="3" class="no-data">No sensors available</td></tr>';
        }

        if (station.activities.length > 0) {
          station.activities.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${activity.date}</td>
              <td>${activity.activity}</td>
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
              <td>${sensor.type}</td>
              <td class="${statusClass}">${sensor.status}</td>
              <td>${sensor.checkedOn || 'N/A'}</td>
            `;
            sensorTableBody.appendChild(row);
          });
        } else {
          sensorTableBody.innerHTML = '<tr><td colspan="3" class="no-data">No sensors available</td></tr>';
        }

        if (station.activities.length > 0) {
          station.activities.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${activity.date}</td>
              <td>${activity.activity}</td>
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
      await loadAWSStationsFromCSV();
      await loadARGStationsFromCSV();
    };