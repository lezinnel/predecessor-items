document.addEventListener("DOMContentLoaded", function () {
  let allData = []; // Stores the full dataset
  let filteredData = []; // Stores the filtered data
  let filters = []; // Stores multiple filters
  let searches = []; //Stores search terms

  function loadCSVData() {
    console.log("Fetching: data/dataset.csv");
    fetch("data/dataset.csv")
      .then(response => response.text())
      .then(data => {
        const parsedData = Papa.parse(data, { header: true }).data;
        allData = parsedData;
        filteredData = [...allData];
        displayData(filteredData);
        populateFilterOptions(allData);
      })
      .catch(error => console.error("Error loading CSV:", error));
  }

  function displayData(data) {
    const table = document.getElementById("data-table");
    const tableBody = table.querySelector("tbody");
    const tableHeader = table.querySelector("thead tr");
    tableBody.innerHTML = '';
    tableHeader.innerHTML = '';

    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="100%">No data found</td></tr>';
      return;
    }

    const headers = Object.keys(data[0]);
    const ability_indx = headers.indexOf('Ability 1');
    const abilityColumns = headers.slice(ability_indx);
    headers.forEach(header => {
      const th = document.createElement("th");
      th.textContent = header;
      tableHeader.appendChild(th);
      
      //Add class to indicate ability column
      if (abilityColumns.includes(header)) {
        th.classList.add("ability-col");
      }
    });

    data.forEach(row => {
      const tr = document.createElement("tr");
      headers.forEach(header => {
        const td = document.createElement("td");
        cellValue = row[header];
        
	if (cellValue && typeof cellValue === "string" && 
            (cellValue.endsWith(".jpg") || cellValue.endsWith(".png") || cellValue.endsWith(".jpeg") || cellValue.endsWith(".webp"))) {
          const img = document.createElement("img");
          img.src = 'https://omeda.city'+cellValue;
          img.alt = "Image";  // Optional alt text, you can customize based on the data
          img.style.maxWidth = "100px";  // Set max width for the image
          img.style.maxHeight = "100px"; // Set max height for the image
          td.appendChild(img);
        } else {
          td.textContent = cellValue;  // For non-image data
        }

        // Highlight non-zero numerical values
        if (!isNaN(parseFloat(row[header])) && parseFloat(row[header]) !== 0) {
          td.classList.add("numeric-highlight");
        }
        // lighten font weight of zero numerical values
        if (!isNaN(parseFloat(row[header])) && parseFloat(row[header]) == 0) {
          td.classList.add("zero");
        }
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });

    // Move filtered columns to the left after the 5th column
    reorderFilteredColumns();
  }

  function reorderFilteredColumns() {
    const table = document.getElementById("data-table");
    const headers = Array.from(table.querySelectorAll("th"));
    const rows = Array.from(table.querySelectorAll("tbody tr"));

    let filteredColumns = filters.map(f => f.column);
    let searchedColumns = searches.map(s => s.columns).flat();
    let filteredOrSearched = filteredColumns.concat(searchedColumns);
    let allColumns = headers.map(th => th.textContent);
    let columnsToMove = filteredOrSearched.filter(col => allColumns.indexOf(col)>6);
    let reorderedColumns = allColumns.filter(col => !columnsToMove.includes(col));
    reorderedColumns.splice(6, 0, ...columnsToMove);

    let newOrder = reorderedColumns.map(col => allColumns.indexOf(col));

    // Reorder header
    headers.forEach((th, index) => {
      th.textContent = reorderedColumns[index];
      th.classList.remove("filtered");
      if (filteredOrSearched.includes(reorderedColumns[index])) {
        th.classList.add("filtered");
      }
    });

    // Reorder rows
    rows.forEach(row => {
      let cells = Array.from(row.children);
      let newCells = newOrder.map(i => cells[i]);
      row.innerHTML = '';
      newCells.forEach(cell => row.appendChild(cell));
    });
  }

  function populateFilterOptions(data) {
    const filterColumnSelect = document.getElementById("filter-column");
    filterColumnSelect.innerHTML = "";
    const columns = Object.keys(data[0]);

    // Exclude the second column (index 1) for image columns
    const nonImageColumns = columns.filter((_, index) => index !== 1);  // Exclude the second column (index 1)
    
    // Exclude items not checked
    const stat_start = columns.indexOf('Physical Power')
    const abl_start = columns.indexOf('Ability 1')
    let columnOptions = nonImageColumns;
    if (!document.getElementById("include-stats").checked) {
      if (!document.getElementById("include-abilities").checked) {
        columnOptions = columnOptions.filter((_, index) => (index < stat_start-1));
      } else {
        columnOptions = columnOptions.filter((_, index) => (index < stat_start-1) || (index >= abl_start-1));
      }
    } 
    else if (!document.getElementById("include-abilities").checked) {
      columnOptions = columnOptions.filter((_, index) => index < abl_start-1);
    }

    columnOptions.forEach(column => {
      const option = document.createElement("option");
      option.value = column;
      option.textContent = column;
      filterColumnSelect.appendChild(option);
    });
  }
  

  function sortData() {
    filters.reverse().forEach(filter => {
      if (filter.sort === "asc") {
        console.log(filter.sort);
        filteredData.sort((a, b) => parseFloat(a[filter.column]) - parseFloat(b[filter.column]));
      } else if (filter.sort === "desc") {
        console.log(filter.sort);
        filteredData.sort((a, b) => parseFloat(b[filter.column]) - parseFloat(a[filter.column]));
      } 
    });
  }

  document.getElementById("include-stats").addEventListener('change', function() {
    populateFilterOptions(allData);
  });

  document.getElementById("include-abilities").addEventListener('change', function() {
    populateFilterOptions(allData);
  });


  function checkSearch(data) {
    // Ensure data is available before filtering
    if (!data.length) return;
    filteredData = [...data];
    searches.forEach(search => {
      filteredData = filteredData.filter(row => {
        const searchColumns = search.columns;
        return searchColumns.some(column => 
          row[column] && row[column].toLowerCase().includes(search.term)
        );
      });
    });

    // Display the filtered data
    displayData(filteredData);
    updateSearchList();
  };

  document.getElementById("search-button").addEventListener("click", () => {
    const searchTerm = document.getElementById("search");
    const abilitySearchTerm = document.getElementById("ability-search");

    if (searchTerm.value!="") {
      const searchType = 'Item';
      const firstColumn = [Object.keys(allData[0])[0]];
      const lowerSearchTerm = searchTerm.value.toLowerCase();
      const newSearch = {
        type: searchType,
        columns: firstColumn,
        term: lowerSearchTerm
      };
      const existingSearchIndex = searches.findIndex(s => s.type === searchType);
      if (existingSearchIndex !== -1) {
        searches[existingSearchIndex] = newSearch; // Update the existing Search
      } else {
        searches.push(newSearch); // Add new Search if it doesn't exist
      }
    };

    if (abilitySearchTerm!="") {
      const searchType = 'Abilities';
      const abilityColumns = ['Ability 1', 'Ability 2', 'Ability 3'];
      const lowerAbilityTerm = abilitySearchTerm.value.toLowerCase();
      const newAbilitySearch = {
        type: searchType,
        columns: abilityColumns,
        term: lowerAbilityTerm
      };
      const existingSearchIndex = searches.findIndex(s => s.type === searchType);
      if (existingSearchIndex !== -1) {
        searches[existingSearchIndex] = newAbilitySearch; // Update the existing Search
      } else {
        searches.push(newAbilitySearch); // Add new Search if it doesn't exist
      }
    }

    if (!filters) {
      checkSearch(allData);
    } else if (filters.length == 0) {
      checkSearch(allData);
    } else {
      applyFilters();
    } 
  });

  document.getElementById("include-stats").addEventListener('change', function() {
    populateFilterOptions(allData);
  });

  document.getElementById("include-abilities").addEventListener('change', function() {
    populateFilterOptions(allData);
  });


  function getTop10FrequentStrings(arr) {
    const filteredArr = arr.filter(str => str !== undefined && str !== null);
    const frequencyMap = {};
    arr.forEach(str => {
        frequencyMap[str] = (frequencyMap[str] || 0) + 1;
    });

    // Convert the frequency map to an array of [string, frequency] pairs
    const sortedStrings = Object.entries(frequencyMap)
        .sort((a, b) => b[1] - a[1]); // Sort by frequency in descending order

    return sortedStrings.slice(0, 10).map(entry => entry[0]);
  }

  document.getElementById("filter-search").addEventListener("change", function () {
    const selectedColumn = this.value;
    const columnValues = allData.map(row => row[selectedColumn]);
    const uniqueValues = [...new Set(columnValues.filter(v => v))];
    const top10Values = getTop10FrequentStrings(columnValues);
    const isNumeric = uniqueValues.every(v => !isNaN(parseFloat(v)));
    const allColumns = Object.keys(allData[0]);

    document.getElementById("numeric-filters").style.display = isNumeric ? "block" : "none";
    document.getElementById("text-filters").style.display = isNumeric ? "none" : "block";
    document.getElementById("sort-order").parentElement.style.display = isNumeric ? "block" : "none";

    // Get containers for include and exclude checkboxes
    const includeUniqueValuesContainer = document.getElementById("include-unique-values-container");
    const excludeUniqueValuesContainer = document.getElementById("exclude-unique-values-container");

    includeUniqueValuesContainer.innerHTML = "";
    excludeUniqueValuesContainer.innerHTML = "";
    
    let checkboxList = [];
    if (uniqueValues.length <=10) {
      checkboxList = uniqueValues;
    } else {
      checkboxList = top10Values;
    } 

    if (!isNumeric && uniqueValues.length <= 10) { //  or  && allColumns.indexOf(selectedColumn)<7
      checkboxList.forEach(value => {
        // Create checkboxes for include words
        const includeCheckbox = document.createElement("input");
        includeCheckbox.type = "checkbox";
        includeCheckbox.value = value;
        includeCheckbox.classList.add("unique-value-checkbox");

        const includeLabel = document.createElement("label");
        includeLabel.appendChild(includeCheckbox);
        includeLabel.appendChild(document.createTextNode(value));

        includeUniqueValuesContainer.appendChild(includeLabel);

        // Create checkboxes for exclude words
        const excludeCheckbox = document.createElement("input");
        excludeCheckbox.type = "checkbox";
        excludeCheckbox.value = value;
        excludeCheckbox.classList.add("unique-value-checkbox");

        const excludeLabel = document.createElement("label");
        excludeLabel.appendChild(excludeCheckbox);
        excludeLabel.appendChild(document.createTextNode(value));

        excludeUniqueValuesContainer.appendChild(excludeLabel);

        // Add event listener to update the include/exclude input fields
        includeCheckbox.addEventListener("change", function () {
          updateIncludeExcludeWords(includeCheckbox, value, "include");
        });

        excludeCheckbox.addEventListener("change", function () {
          updateIncludeExcludeWords(excludeCheckbox, value, "exclude");
        });
      });
    } else {
      populateIncludeExcludeOptions(allData,uniqueValues);
    }
  });

  function populateIncludeExcludeOptions(data,uniqueValues) {
    const includeSelect = document.getElementById("include-list");
    const excludeSelect = document.getElementById("exclude-list");

    includeSelect.innerHTML = "";
    excludeSelect.innerHTML = "";

    uniqueValues.forEach(val => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      includeSelect.appendChild(option);
    });

    uniqueValues.forEach(val => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      excludeSelect.appendChild(option);
    });
  }

  function updateIncludeExcludeWords(checkbox, value, type) {
    const includeWordsField = document.getElementById("include-words");
    const excludeWordsField = document.getElementById("exclude-words");

    if (type === "include") {
      // If the checkbox is checked, add the value to the include-words field
      if (checkbox.checked) {
        if (includeWordsField && includeWordsField.value !== "") {
          includeWordsField.value += `, ${value}`;
        } else {
          includeWordsField.value = value;  // First value selected
        }
      } else {
        // Remove the value from the include-words field
        updateInputField(includeWordsField, value);
      }
    } else if (type === "exclude") {
      // If the checkbox is checked, add the value to the exclude-words field
      if (checkbox.checked) {
        if (excludeWordsField && excludeWordsField.value !== "") {
          excludeWordsField.value += `, ${value}`;
        } else {
          excludeWordsField.value = value;  // First value selected
        }
      } else {
        // Remove the value from the exclude-words field
        updateInputField(excludeWordsField, value);
      }
    }
  }

  // Utility function to update the input field when a value is removed
  function updateInputField(inputField, value) {
    const fieldValues = inputField.value.split(",").map(v => v.trim());
    const filteredValues = fieldValues.filter(v => v !== value);
    inputField.value = filteredValues.join(", ");
  }

  function applyFilters() {
    filteredData = [...allData];
    const abilityColumns = ['Ability 1', 'Ability 2', 'Ability 3'];
    filters.forEach(filter => {
      filteredData = filteredData.filter(row => {
        const value = row[filter.column];
        if (!value) return false;

        if (filter.type === "numeric") {
          const num = parseFloat(value);
          if (filter.min && num < filter.min) return false;
          if (filter.max && num > filter.max) return false;
        } else {
          const words = filter.words.split(",").map(w => w.trim().toLowerCase());
          let excludeWords = filter.exclude ? filter.exclude.split(",").map(w => w.trim().toLowerCase()) : ["0"];

          const valueLower = String(value).toLowerCase();

          if (filter.includeAny && !words.some(word => valueLower.includes(word))) return false;
          if (filter.includeAll && !words.every(word => valueLower.includes(word))) return false;
          if (!isNaN(parseFloat(value)) && parseFloat(value) == 0 && !abilityColumns.includes(filter.column)) {
            return false;
          } else if (filter.exclude && excludeWords.some(word => valueLower.includes(word))) {
            return false;
          }
        }
        return true;
      });
    });
    sortData();
    displayData(filteredData);
    checkSearch(filteredData);
    updateFilterList();
  }

  function updateFilterList() {
    const filterList = document.getElementById("filter-list");
    filterList.innerHTML = "";
    filters.forEach((filter, index) => {
      const li = document.createElement("li");
      li.textContent = `${filter.column}: ${filter.words || filter.min + " - " + filter.max || "No filter applied"}`;
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        filters.splice(index, 1);
        applyFilters();
      });
      li.appendChild(removeButton);
      filterList.appendChild(li);
    });
  }

  function updateSearchList() {
    const searchList = document.getElementById("search-list");
    searchList.innerHTML = "";
    searches.forEach((search, index) => {
      const li = document.createElement("li");
      li.textContent = `${search.type}: ${search.term || "No search term applied"}`;
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => {
        searches.splice(index, 1);
        applyFilters();
      });
      li.appendChild(removeButton);
      searchList.appendChild(li);
    });
  }

  document.getElementById("apply-filter").addEventListener("click", () => {
    if (!document.getElementById("filter-search")) return;
    const column = document.getElementById("filter-search").value;
    //const isNumeric = allData.slice(1).every(row => row[column] && !isNaN(parseFloat(row[column])));
    const isNumeric = !allData.slice(1).some(row =>row[column] && isNaN(parseFloat(row[column])));
    const sortOrder = isNumeric ? document.getElementById("sort-order").value : "auto";
    
    const newFilter = {
      column,
      type: isNumeric ? "numeric" : "text",
      min: isNumeric ? parseFloat(document.getElementById("min-value").value) || null : null,
      max: isNumeric ? parseFloat(document.getElementById("max-value").value) || null : null,
      words: isNumeric ? "" : document.getElementById("include-words").value,
      includeAny: document.getElementById("include-any").checked,
      includeAll: document.getElementById("include-all").checked,
      exclude: document.getElementById("exclude-words").value,
      sort: sortOrder
    };

    //filters.push(newFilter);
    const existingFilterIndex = filters.findIndex(f => f.column === column);
    if (existingFilterIndex !== -1) {
      filters[existingFilterIndex] = newFilter; // Update the existing filter
    } else {
      filters.push(newFilter); // Add new filter if it doesn't exist
    }
    applyFilters();

    // clear input fields
    document.getElementById("filter-search").value = "";
    document.getElementById("include-words").value = "";
    document.getElementById("exclude-words").value = "";

    document.getElementById("include-list").innerHTML = "";
    document.getElementById("exclude-list").innerHTML = "";
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    filters = [];
    document.getElementById("filter-search").value = "";
    document.getElementById("include-words").value = "";
    document.getElementById("exclude-words").value = "";
    document.getElementById("include-list").innerHTML = "";
    document.getElementById("exclude-list").innerHTML = "";
    filteredData = [...allData];
    if (searches.length == 0) {
      displayData(filteredData);
    } else { 
      checkSearch(filteredData);
    }
    updateFilterList();
  });

  document.getElementById("clear-searches").addEventListener("click", () => {
    searches = [];
    updateSearchList();
    if (document.getElementById("search")) {
      document.getElementById("search").value = "";
    } 
    if (document.getElementById("ability-search")) {
      document.getElementById("ability-search").value = "";
    }
    if (!filters) {
      filteredData = [...allData];
      displayData(filteredData);
    } else if (filters.length == 0) {
      filteredData = [...allData];
      displayData(filteredData);
    } else {
      applyFilters();
    } 
  });

  loadCSVData();
});