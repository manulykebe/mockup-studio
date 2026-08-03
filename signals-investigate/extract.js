(() => {
  // src/dom.js
  function controlValue(control) {
    if (!control) {
      return "";
    }
    if (control.tagName === "SELECT") {
      return control.selectedOptions[0]?.textContent.trim() ?? "";
    }
    if (control.type === "checkbox") {
      return control.checked ? "TRUE" : "FALSE";
    }
    return control.value ?? "";
  }
  function parseFieldEditForm(form) {
    const pairs = [];
    const seenNames = /* @__PURE__ */ new Set();
    Array.from(form.querySelectorAll("label")).forEach((label) => {
      const name = label.textContent.replace(/\*/g, "").replace(/\(required\)/gi, "").replace(/\s+/g, " ").trim();
      if (!name || seenNames.has(name)) {
        return;
      }
      let control = label.htmlFor ? form.querySelector(`#${CSS.escape(label.htmlFor)}`) : null;
      if (!control) {
        const scope = label.closest(".mb-3") || label.parentElement;
        control = scope?.querySelector("input, select");
      }
      if (!control) {
        return;
      }
      seenNames.add(name);
      pairs.push([name, controlValue(control)]);
    });
    const triggerSelect = form.querySelector("select.form-select");
    if (triggerSelect) {
      pairs.push(["Trigger Event", controlValue(triggerSelect)]);
    }
    return pairs;
  }
  function extractTocData(root) {
    const toc = root.querySelector(".binder__toc");
    if (!toc) {
      throw new Error("No .binder__toc element found on the page.");
    }
    const groups = Array.from(toc.children).filter((el) => el.querySelector(".binder__toc-page"));
    const rows = [];
    groups.forEach((group) => {
      const parentNameEl = group.querySelector(".binder__toc-page-name");
      const parentName = parentNameEl ? parentNameEl.textContent.trim() : "";
      const childNameEls = group.querySelectorAll(".binder__toc-element-name");
      if (childNameEls.length === 0) {
        rows.push([parentName, ""]);
        return;
      }
      childNameEls.forEach((childEl) => {
        rows.push([parentName, childEl.textContent.trim()]);
      });
    });
    return rows;
  }

  // src/csv.js
  var CSV_DELIMITER = ";";
  function escapeCsvField(field) {
    const value = String(field ?? "");
    if (new RegExp(`["${CSV_DELIMITER}
]`).test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  function toCsv(rows, headers) {
    const allRows = headers ? [headers, ...rows] : rows;
    return allRows.map((row) => row.map(escapeCsvField).join(CSV_DELIMITER)).join("\n");
  }

  // src/download.js
  function downloadCsv(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function getUrlPrefix(location) {
    return location.hostname.split(".")[0] || "export";
  }

  // src/popup.js
  var TOOLBAR_TAB_BUTTON_SELECTOR = ".toolbar__tab-button.btn.btn-link.btn-sm";
  var CLOSE_POPUP_SELECTOR = '[aria-label="Close view"]';
  var POPUP_LOAD_QUIET_MS = 300;
  var POPUP_LOAD_TIMEOUT_MS = 1e4;
  function waitForElement(selector, timeoutMs) {
    const existing = document.querySelector(selector);
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timed out waiting for "${selector}" to appear.`));
      }, timeoutMs);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(el);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
  function waitForCondition(predicate, timeoutMs) {
    const existing = predicate();
    if (existing) {
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timed out waiting for condition to become true."));
      }, timeoutMs);
      const observer = new MutationObserver(() => {
        const result = predicate();
        if (result) {
          clearTimeout(timer);
          observer.disconnect();
          resolve(result);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
  function waitForDomToSettle(quietMs, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      let quietTimer;
      const finish = () => {
        clearTimeout(quietTimer);
        observer.disconnect();
        resolve();
      };
      const observer = new MutationObserver(() => {
        if (Date.now() - start >= timeoutMs) {
          finish();
          return;
        }
        clearTimeout(quietTimer);
        quietTimer = setTimeout(finish, quietMs);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      quietTimer = setTimeout(finish, quietMs);
    });
  }
  async function openToolbarPopup(label) {
    const buttons = Array.from(document.querySelectorAll(TOOLBAR_TAB_BUTTON_SELECTOR));
    const button = label ? buttons.find((btn) => btn.textContent.trim().toLowerCase() === label.trim().toLowerCase()) : buttons[0];
    if (!button) {
      throw new Error(`No toolbar tab button found${label ? ` matching "${label}"` : ""}.`);
    }
    button.click();
    await waitForElement(CLOSE_POPUP_SELECTOR, POPUP_LOAD_TIMEOUT_MS);
    await waitForDomToSettle(POPUP_LOAD_QUIET_MS, POPUP_LOAD_TIMEOUT_MS);
    return button;
  }
  function closePopup() {
    const button = document.querySelector(CLOSE_POPUP_SELECTOR);
    if (!button) {
      throw new Error('No "Close view" button found.');
    }
    button.click();
    return button;
  }

  // src/table.js
  var ICON_SELECTOR = 'svg[data-icon], [class*="fa-"]';
  function cellToText(cell) {
    const checkbox = cell.querySelector('input[type="checkbox"]');
    if (checkbox) {
      return checkbox.checked ? "TRUE" : "FALSE";
    }
    const text = cell.textContent.trim();
    if (text) {
      return text;
    }
    const icons = Array.from(cell.querySelectorAll(ICON_SELECTOR));
    return icons.map(iconToLabel).filter(Boolean).join(", ");
  }
  function iconToLabel(icon) {
    const labelled = icon.closest("[aria-label]");
    if (labelled) {
      return labelled.getAttribute("aria-label").trim();
    }
    const dataIcon = icon.getAttribute("data-icon");
    if (dataIcon) {
      return dataIcon.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "";
  }
  function parseHtmlTable(table) {
    const headers = Array.from(table.querySelectorAll("thead th")).map(
      (th, i) => cellToText(th) || `Column ${i + 1}`
    );
    const rows = Array.from(table.querySelectorAll("tbody tr")).map(
      (tr) => Array.from(tr.children).map((cell) => cellToText(cell))
    );
    return { headers, rows };
  }

  // node_modules/async-monitor.js/dist/async-monitor.esm.js
  var Sequence = (
    /** @class */
    (function() {
      function Sequence2() {
      }
      Sequence2.resetFunctionIdCounter = function() {
        Sequence2._nextFunctionId = 1;
      };
      Sequence2.nextId = function() {
        return Sequence2._nextId++;
      };
      Sequence2.nextFunctionId = function() {
        return Sequence2._nextFunctionId++;
      };
      Sequence2.nextGroupId = function() {
        return Sequence2._nextGroupId++;
      };
      Sequence2._nextId = 1;
      Sequence2._nextFunctionId = 1;
      Sequence2._nextGroupId = 1;
      return Sequence2;
    })()
  );
  var version = "1.2.1+build.102";
  function createTableFromObject(data) {
    var table = document.createElement("table");
    table.classList.add("log-table");
    if (Array.isArray(data) && data.length > 0) {
      var headerRow_1 = document.createElement("tr");
      var keys_1 = Object.keys(data[0]);
      keys_1.forEach(function(key) {
        var th = document.createElement("th");
        th.textContent = key;
        th.classList.add("log-table-header");
        headerRow_1.appendChild(th);
      });
      table.appendChild(headerRow_1);
      data.forEach(function(item) {
        var row = document.createElement("tr");
        keys_1.forEach(function(key) {
          var td = document.createElement("td");
          var jsonstring = "";
          try {
            jsonstring = JSON.stringify(item[key]);
          } catch (error) {
            jsonstring = "".concat(key, ": ").concat(error);
          }
          td.textContent = typeof item[key] === "object" ? jsonstring : item[key];
          td.classList.add("log-table-cell");
          row.appendChild(td);
        });
        table.appendChild(row);
      });
    } else if (typeof data === "object") {
      var headerRow = document.createElement("tr");
      var thKey = document.createElement("th");
      thKey.textContent = "Property";
      thKey.classList.add("log-table-header");
      var thValue = document.createElement("th");
      thValue.textContent = "Value";
      thValue.classList.add("log-table-header");
      headerRow.appendChild(thKey);
      headerRow.appendChild(thValue);
      table.appendChild(headerRow);
      Object.keys(data).forEach(function(key) {
        var row = document.createElement("tr");
        var keyCell = document.createElement("td");
        keyCell.textContent = key;
        keyCell.classList.add("log-table-cell");
        var valueCell = document.createElement("td");
        var jsonstring = "";
        try {
          jsonstring = JSON.stringify(data[key], void 0, 4);
        } catch (error) {
          jsonstring = "".concat(key, ": ").concat(error);
        }
        valueCell.textContent = typeof data[key] === "object" ? jsonstring : data[key];
        valueCell.classList.add("log-table-cell");
        row.appendChild(keyCell);
        row.appendChild(valueCell);
        table.appendChild(row);
      });
    }
    return table;
  }
  function findSpanElementWithClassAndText(text, _id, className) {
    var treeElement = document.querySelector('pre[class*="tree-'.concat(_id, '"]'));
    if (!treeElement)
      return null;
    var spanElements = treeElement.querySelectorAll("span.highlight-".concat(className));
    for (var _i = 0, _a = Array.from(spanElements); _i < _a.length; _i++) {
      var span = _a[_i];
      if (typeof text === "string" && span.textContent === text) {
        return span;
      } else if (text instanceof RegExp && span.textContent !== null && text.test(span.textContent)) {
        return span;
      }
    }
    return null;
  }
  function getCurrentTime() {
    var now2 = /* @__PURE__ */ new Date();
    return now2.toTimeString().split(" ")[0];
  }
  var Logger = (
    /** @class */
    (function() {
      function Logger2(useLogger) {
        if (useLogger === void 0) {
          useLogger = false;
        }
        this.useLogger = useLogger;
        this.id = "logger-".concat(Sequence.nextId());
      }
      Logger2.prototype.addToDocument = function(location, divId) {
        if (divId === void 0) {
          divId = this.id;
        }
        if (typeof document === "undefined") {
          return false;
        }
        if (!location) {
          location = document.body;
        }
        this.addCSSToDocument();
        var div = document.getElementById(divId);
        if (div) {
          div.innerHTML = "";
        } else {
          var loggerDiv = document.createElement("div");
          loggerDiv.id = divId;
          loggerDiv.classList.add("logger", "".concat(this.id));
          location.appendChild(loggerDiv);
        }
        this.log("async-monitor.js$".concat(version), "log-info");
        return true;
      };
      Logger2.prototype.addCSSToDocument = function(cssHref) {
        if (cssHref === void 0) {
          cssHref = "https://manulykebe.github.io/async-monitor.js/examples/styles.css";
        }
        if (typeof document === "undefined") {
          return;
        }
        var existingLink = document.querySelector('link[href="'.concat(cssHref, '"]'));
        if (!existingLink) {
          var link = document.createElement("link");
          link.rel = "stylesheet";
          link.type = "text/css";
          link.href = cssHref;
          document.head.appendChild(link);
        }
      };
      Logger2.prototype.appendLogTologger = function(message, classnames, _id, uuid) {
        if (typeof document === "undefined") {
          return;
        }
        if (message === null)
          message = "<null>";
        if (message === void 0)
          message = "<undefined>";
        if (typeof message === "string" && message.trim() === "")
          return;
        var loggerDiv = document.getElementById(this.id);
        if (loggerDiv) {
          var logEntry = document.createElement("div");
          logEntry.classList.add("log-entry");
          if (uuid) {
            logEntry.classList.add("function-".concat(uuid));
            logEntry.setAttribute("data-uuid", uuid);
          }
          var timeCol = document.createElement("div");
          timeCol.classList.add("log-time");
          timeCol.textContent = getCurrentTime();
          var messageCol = document.createElement("div");
          messageCol.classList.add("log-message");
          if (typeof message === "object") {
            var table = createTableFromObject(message);
            messageCol.appendChild(table);
          } else {
            var pre_1 = document.createElement("pre");
            if (!Array.isArray(classnames))
              classnames = [classnames];
            if (!_id && typeof _id === "number") {
              classnames.push("log-group-".concat(_id));
            }
            classnames.forEach(function(c) {
              if (typeof c === "string" && c.trim() !== "") {
                pre_1.classList.add(c.trim());
              }
            });
            pre_1.textContent = message;
            messageCol.appendChild(pre_1);
          }
          logEntry.appendChild(timeCol);
          logEntry.appendChild(messageCol);
          loggerDiv.appendChild(logEntry);
        }
      };
      Logger2.prototype.clear = function() {
        if (!this.useLogger)
          return;
        if (typeof document === "undefined") {
          return;
        }
        var loggerDiv = document.getElementById(this.id);
        if (loggerDiv) {
          loggerDiv.innerHTML = "";
        }
        this.log("async-monitor.js$".concat(version));
        this.log("".concat(this.id));
      };
      Logger2.prototype.log = function(message, classnames, uuid) {
        var _id;
        if (typeof classnames === "number") {
          _id = classnames;
          classnames = void 0;
        }
        this.appendLogTologger(message, classnames || [], _id, uuid);
      };
      Logger2.prototype.warn = function(message, _id, uuid) {
        this.appendLogTologger(message, "log-warn", _id, uuid);
      };
      Logger2.prototype.error = function(message, _id, uuid) {
        this.appendLogTologger(message, "log-error", _id, uuid);
      };
      Logger2.prototype.group = function(label, _id) {
        this.appendLogTologger("".concat(label), "log-group", _id);
      };
      Logger2.prototype.table = function(data) {
        this.appendLogTologger(data, "log-table");
      };
      Logger2.prototype.highlight = function(text, ids, className) {
        if (className === void 0) {
          className = "start";
        }
        if (typeof document === "undefined") {
          return;
        }
        var treeElement = document.querySelector('pre[class*="tree-'.concat(ids.id, '"]'));
        if (!treeElement) {
          this.warn("could not highlight tree-".concat(ids.id, "."));
          return;
        }
        if (!Array.isArray(className))
          className = [className];
        if (className.includes("start")) {
          var uuidAttr_1 = ids.uuid ? ' data-monitor-uuid="'.concat(ids.uuid, '"') : "";
          var highlightedText = treeElement.innerHTML.replace(text, function(match) {
            return '<span data-monitor-tree="'.concat(ids.id, '" data-monitor-index="').concat(ids.index, '"').concat(uuidAttr_1, ' class="highlight-').concat(className.join(" highlight-"), '"><i class="fas fa-stop icon" onclick="interact();"></i>').concat(match, "</span>");
          });
          treeElement.innerHTML = highlightedText;
        } else {
          var spanElement = findSpanElementWithClassAndText(text, ids.id, "start");
          if (spanElement) {
            spanElement.classList.remove("highlight-start");
            spanElement.classList.add("highlight-".concat(className));
          }
        }
      };
      Logger2.prototype.clearHighlights = function(_id) {
        if (typeof document === "undefined") {
          return;
        }
        var treeElement = document.querySelector('pre[class*="tree-'.concat(_id, '"]'));
        if (treeElement) {
          treeElement.querySelectorAll("span").forEach(function(span) {
            if (!(span.innerText === "completed" || span.classList.contains("highlight-repeat")))
              span.outerHTML = span.innerHTML;
          });
        }
      };
      Logger2.prototype.displayRepeat = function(_id, runsNo, repeatNo) {
        if (typeof document === "undefined") {
          return;
        }
        var treeElement = document.querySelector('pre[class*="tree-'.concat(_id, '"]'));
        if (treeElement) {
          var repeatElement = treeElement.querySelector('span[class*="highlight-repeat"]');
          if (repeatElement) {
            repeatElement.innerText = " ".repeat(1 - runsNo.toString().length + repeatNo.toString().length) + runsNo.toString().concat("/").concat(repeatNo.toString()).concat(" ");
          }
        }
      };
      Logger2.prototype.updateFunctionStatus = function(uuid, status) {
        if (typeof document === "undefined") {
          return;
        }
        var element = document.getElementById("fn-".concat(uuid));
        if (element) {
          element.setAttribute("data-status", status);
          element.classList.remove("status-pending", "status-running", "status-resolved", "status-rejected", "status-aborted");
          element.classList.add("status-".concat(status));
        }
        var logEntries = document.querySelectorAll(".function-".concat(uuid));
        logEntries.forEach(function(entry) {
          entry.setAttribute("data-status", status);
        });
      };
      Logger2.prototype.highlightFunction = function(uuid, className) {
        if (typeof document === "undefined") {
          return;
        }
        var element = document.getElementById("fn-".concat(uuid));
        if (element) {
          element.classList.add(className);
        }
        var logEntries = document.querySelectorAll(".function-".concat(uuid));
        logEntries.forEach(function(entry) {
          entry.classList.add(className);
        });
      };
      Logger2.prototype.setFunctionState = function(uuid, state) {
        if (typeof document === "undefined") {
          return;
        }
        var element = document.getElementById("fn-".concat(uuid));
        if (element) {
          Object.entries(state).forEach(function(_a) {
            var key = _a[0], value = _a[1];
            element.setAttribute("data-".concat(key), String(value));
          });
        }
      };
      Logger2.prototype.createFunctionStatusElement = function(uuid, name, initialStatus) {
        if (initialStatus === void 0) {
          initialStatus = "pending";
        }
        if (typeof document === "undefined") {
          return;
        }
        var loggerDiv = document.getElementById(this.id);
        if (!loggerDiv)
          return;
        var statusElement = document.getElementById("fn-".concat(uuid));
        if (!statusElement) {
          statusElement = document.createElement("div");
          statusElement.id = "fn-".concat(uuid);
          statusElement.classList.add("function-status", "function-".concat(uuid));
          statusElement.setAttribute("data-uuid", uuid);
          statusElement.setAttribute("data-name", name);
          statusElement.setAttribute("data-status", initialStatus);
          statusElement.classList.add("status-".concat(initialStatus));
          var nameSpan = document.createElement("span");
          nameSpan.classList.add("function-name");
          nameSpan.textContent = name;
          var statusSpan = document.createElement("span");
          statusSpan.classList.add("function-status-indicator");
          statusSpan.textContent = initialStatus;
          statusElement.appendChild(nameSpan);
          statusElement.appendChild(statusSpan);
        }
        return statusElement;
      };
      return Logger2;
    })()
  );
  var __awaiter$1 = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator$1 = function(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var Monitor = (
    /** @class */
    (function() {
      function Monitor2(functions) {
        this.functions = functions;
      }
      Monitor2.prototype.settled = function() {
        return __awaiter$1(this, void 0, void 0, function() {
          var statusesPromise;
          return __generator$1(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, Promise.allSettled(this.functions)];
              case 1:
                statusesPromise = _a.sent();
                return [2, {
                  statusesPromise
                }];
            }
          });
        });
      };
      return Monitor2;
    })()
  );
  var now = function() {
    return parseFloat(performance.now().toFixed(0));
  };
  function calcDuration(start, end) {
    return parseFloat((end - start).toFixed(0));
  }
  var __awaiter = function(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
  var __generator = function(thisArg, body) {
    var _ = { label: 0, sent: function() {
      if (t[0] & 1) throw t[1];
      return t[1];
    }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
      return this;
    }), g;
    function verb(n) {
      return function(v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while (g && (g = 0, op[0] && (_ = 0)), _) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
  var Watch = (
    /** @class */
    /* @__PURE__ */ (function() {
      function Watch2(fs, f) {
        var breakOnReject = false;
        var promises = fs.map(function(x) {
          return x.promise;
        });
        var monitorInstance = new Monitor(promises);
        return monitorInstance.settled().then(function(_a) {
          var statusesPromise = _a.statusesPromise;
          for (var i = 0; i < statusesPromise.length; i++) {
            fs[i].promiseStatus.status = statusesPromise[i].status;
            fs[i].promiseStatus.reason = statusesPromise[i].status === "rejected" ? statusesPromise[i].reason : void 0;
            fs[i].promiseStatus.value = statusesPromise[i].status === "fulfilled" ? statusesPromise[i].value : void 0;
          }
          breakOnReject = statusesPromise.some(function(x) {
            return x.status === "rejected";
          });
        }).catch(function(err) {
          console.warn("error:", err);
        }).finally(function() {
          var fs0 = fs[0];
          if (breakOnReject) {
            if (fs0.group && typeof fs0.group.onRejectCallback === "function")
              fs0.group.onRejectCallback();
            if (fs0.group && fs0.group.options.abortOnReject) {
              return;
            }
          }
          var breakOnAbort = fs.some(function(f2) {
            return f2.isAborted;
          });
          if (breakOnAbort) {
            return;
          }
          if (!Array.isArray(f))
            f = [f];
          if (Array.isArray(f)) {
            f.forEach(function(cbf) {
              if (typeof cbf === "function") {
                cbf();
              }
            });
          }
        });
      }
      return Watch2;
    })()
  );
  var _sequence = 0;
  function watchAll(group) {
    return __awaiter(this, void 0, void 0, function() {
      return __generator(this, function(_a) {
        if (group.functions.filter(function(x) {
          return x.parent === void 0;
        }).length < 1) {
          group.logger.error("Group must have exactly one root function (aka parent === undefined)!");
          return [2, new Promise(function(resolve, reject) {
            reject();
          })];
        }
        return [2, new Promise(function(resolve, reject) {
          _watchAllInternal(group, void 0, resolve, reject);
        })];
      });
    });
  }
  function _watchAllInternal(group, parent, resolve, reject) {
    var watches = group.functions;
    group.useLogger;
    var children = watches.filter(function(x) {
      return x.parent === parent;
    });
    if (watches.some(function(f) {
      return f.isRejected;
    })) {
      if (group.logger.useLogger) {
        group.logger.warn("Some watches are rejected.");
      }
      if (typeof group.onRejectCallback === "function") {
        group.onRejectCallback();
      }
      if (group.options.abortOnReject) {
        reject && reject();
        return;
      }
    }
    if (watches.some(function(f) {
      return f.isAborted;
    })) {
      if (group.logger.useLogger) {
        group.logger.warn("Some watches are aborted.");
      }
      if (typeof group.onAbortCallback === "function") {
        var abortedWatch = watches.find(function(f) {
          return f.isAborted;
        });
        group.onAbortCallback((abortedWatch === null || abortedWatch === void 0 ? void 0 : abortedWatch.name) || "unknown", "watch aborted", "abort");
      }
      if (group.options.abortOnAbort || group.manualGroupAbort) {
        reject && reject();
        return;
      }
    }
    if (watches.every(function(f) {
      return f.isProcessed;
    })) {
      group.stopTime = now();
      if (group.options.repeat === 0) {
        if (typeof group.onCompleteCallback === "function") {
          group.onCompleteCallback();
        }
        resolve && resolve();
        return;
      } else if (group.options.repeat > 0) {
        if (typeof group.onCompleteRunCallback === "function") {
          group.onCompleteRunCallback();
        }
        if (group.manualGroupAbort) {
          reject && reject();
          return;
        }
        if (watches.some(function(f) {
          return f.isRejected;
        }) && (group.options.abortOnReject || group.options.abortOnAbort)) {
          reject && reject();
          return;
        }
        if (watches.some(function(f) {
          return f.isAborted;
        }) && group.options.abortOnAbort) {
          reject && reject();
          return;
        }
        if (group.options.repeat > group.options.runs) {
          group.options.runs++;
          group.reset(false);
          return _watchAllInternal(group, void 0, resolve, reject);
        } else {
          if (typeof group.onCompleteCallback === "function") {
            group.onCompleteCallback();
          }
          resolve && resolve();
          return;
        }
      }
    }
    if (parent === void 0) {
      if (children.length === 0) {
        return;
      }
      if (group.options.repeat > 0) {
        if (typeof group.onStartRunCallback === "function")
          group.onStartRunCallback();
      }
      _sequence = 0;
    }
    if (parent !== void 0) {
      var parentFunctions = watches.filter(function(f) {
        return f.child === parent;
      });
      var anyParentRejectedOrAborted = parentFunctions.some(function(pf) {
        return pf.isRejected || pf.isAborted;
      });
      var propagationEnabled = group.options.abortOnReject || group.options.abortOnAbort;
      if (anyParentRejectedOrAborted && propagationEnabled) {
        return;
      }
    }
    if (children.length > 0) {
      var grandChildren = children.map(function(x) {
        return x.child;
      }).filter(function(currentValue, index, arr) {
        return arr.indexOf(currentValue) === index;
      });
      grandChildren.forEach(function(gc) {
        _sequence++;
        children.filter(function(c) {
          return c.child === gc;
        }).forEach(function(child) {
          child.sequence = _sequence;
          group.logger.highlight("".concat(child.id, ". ").concat(child.name || child.uuid), { id: group.id, index: child.id, uuid: child.uuid }, "start");
          if (typeof child.onStartCallback === "function") {
            child.onStartCallback.call(child);
          }
          if (typeof child.f === "function") {
            var result = child.f();
            if (result === void 0 || result === null) {
              if (group.logger.useLogger) {
                group.logger.warn("Function returned void");
              }
            } else if (typeof result.then === "function") {
              child.promise = result;
              child.promise = child.promise.then(function(value) {
                if (typeof child.onCompleteCallback === "function") {
                  child.onCompleteCallback.call(child);
                }
                group.logger.highlight("".concat(child.id, ". ").concat(child.name || child.uuid), { id: group.id, uuid: child.uuid }, "complete");
                return value;
              }).catch(function(err) {
                if (typeof child.onRejectCallback === "function") {
                  child.onRejectCallback.call(child);
                }
                group.logger.highlight("".concat(child.id, ". ").concat(child.name || child.uuid), { id: group.id, uuid: child.uuid }, "rejected");
                group.logger.highlight("completed", { id: group.id }, "rejected");
                reject && reject(err);
                throw err;
              });
            } else {
              if (group.logger.useLogger) {
                group.logger.warn("Function did not return a promise");
              }
            }
          }
        });
      });
      if (group.isFinished) ;
      else {
        grandChildren.forEach(function(gc) {
          var validChildren = children.filter(function(c) {
            return c.child === gc;
          }).map(function(child) {
            var _a;
            child.promise = (_a = child.promise) !== null && _a !== void 0 ? _a : Promise.resolve();
            return child;
          });
          new Watch(validChildren, [
            function() {
              watches.filter(function(x) {
                return x.parent === parent;
              }).filter(function(c) {
                return c.child === gc;
              }).map(function(x) {
                return x.child;
              }).filter(function(currentValue, index, arr) {
                return arr.indexOf(currentValue) === index;
              }).forEach(function(x) {
                _watchAllInternal(group, x, resolve, reject);
              });
            }
          ]);
        });
      }
    }
  }
  var Tree = (
    /** @class */
    (function() {
      function Tree2(options) {
        if (options === void 0) {
          options = {};
        }
        var _a;
        this.map = {};
        this.roots = [];
        this.consoleLogText = "";
        this.repeatOptions = { repeat: 0, current: 0 };
        this.repeatOptions.repeat = (_a = options.repeat) !== null && _a !== void 0 ? _a : 0;
      }
      Tree2.prototype.buildTree = function(arr) {
        var _this = this;
        var rootNames = /* @__PURE__ */ new Set();
        arr.forEach(function(_a) {
          var parent = _a.parent, child = _a.child, name = _a.name, uuid = _a.uuid, seq = _a.seq;
          if (child !== void 0) {
            if (!_this.map[child]) {
              _this.map[child] = {
                name: child,
                description: seq ? "".concat(seq, ". ").concat(name || uuid) : name || uuid || String(child),
                children: []
              };
            } else {
              if (name && !_this.map[child].description.includes(name)) {
                _this.map[child].description += seq ? ", ".concat(seq, ". ").concat(name) : ", ".concat(name);
              }
            }
          }
          if (parent === void 0) {
            if (child !== void 0) {
              if (!_this.map[child]) {
                _this.map[child] = {
                  name: child,
                  description: seq ? "".concat(seq, ". ").concat(name || uuid) : name || uuid || String(child),
                  children: []
                };
              }
              if (!rootNames.has(child)) {
                _this.roots.push(_this.map[child]);
                rootNames.add(child);
              }
            } else if (name !== void 0 || uuid !== void 0) {
              var nodeId = uuid || name || "";
              if (!_this.map[nodeId]) {
                _this.map[nodeId] = {
                  name: nodeId,
                  description: seq ? "".concat(seq, ". ").concat(name || uuid || "") : name || uuid || "",
                  children: []
                };
                _this.roots.push(_this.map[nodeId]);
              }
            }
          } else {
            if (!_this.map[parent]) {
              _this.map[parent] = {
                name: parent,
                description: String(parent),
                children: []
              };
            }
            if (child !== void 0) {
              var existingChild = _this.map[parent].children.find(function(c) {
                return c.name === child;
              });
              if (!existingChild) {
                _this.map[parent].children.push(_this.map[child]);
              }
            } else {
              if (!_this.map[parent].children.some(function(c) {
                return c.description === (name || uuid);
              })) {
                _this.map[parent].children.push({
                  name: "",
                  description: seq ? "".concat(seq, ". ").concat(name || uuid || "") : name || uuid || "",
                  children: []
                });
              }
            }
          }
        });
        return this.roots;
      };
      Tree2.prototype.buildLinePrefix = function(prefix, node, isFirst, isFirstRoot, isLast) {
        var repeatIndicator = " ";
        var repeatIndicatorFirstLine = "\u2500";
        if (this.repeatOptions.repeat != 0) {
          repeatIndicator = " \u2502";
          repeatIndicatorFirstLine = isFirst ? isFirstRoot ? "\u252C\u2500" : "\u253C\u2500" : "\u2500";
        }
        return "".concat(isFirst ? "\u2500" + repeatIndicatorFirstLine + "\u2500" : repeatIndicator + prefix + (isLast && !isFirst ? "\u2514\u2500" : "\u251C\u2500"), " ").concat(node.description);
      };
      Tree2.prototype.collectDisplayLines = function(node, lines, prefix, isFirst, isFirstRoot, isLast) {
        var _this = this;
        if (prefix === void 0) {
          prefix = "";
        }
        if (isFirst === void 0) {
          isFirst = true;
        }
        if (isFirstRoot === void 0) {
          isFirstRoot = false;
        }
        if (isLast === void 0) {
          isLast = true;
        }
        lines.push({
          base: this.buildLinePrefix(prefix, node, isFirst, isFirstRoot, isLast),
          isTerminal: node.children.length === 0
        });
        var newPrefix = prefix + (isLast ? "   " : "\u2502  ");
        node.children.forEach(function(child, index) {
          var isLastChild = index === node.children.length - 1;
          _this.collectDisplayLines(child, lines, newPrefix, false, isFirstRoot, isLastChild);
        });
      };
      Tree2.prototype.processTree = function(data) {
        var _this = this;
        this.map = {};
        this.roots = [];
        this.consoleLogText = "";
        if (data.length === 0) {
          return "<empty tree>";
        }
        var tree = this.buildTree(data);
        var lineSpecs = [];
        tree.forEach(function(root, index) {
          return _this.collectDisplayLines(root, lineSpecs, "", true, index === 0, true);
        });
        var encounteredTerminal = false;
        var maxWidth = 0;
        var hasSiblingContinuation = false;
        lineSpecs.forEach(function(spec) {
          if (spec.isTerminal) {
            encounteredTerminal = true;
            maxWidth = Math.max(maxWidth, spec.base.length + 3);
          } else if (encounteredTerminal) {
            hasSiblingContinuation = true;
            maxWidth = Math.max(maxWidth, spec.base.length + 1);
          } else {
            maxWidth = Math.max(maxWidth, spec.base.length);
          }
        });
        if (hasSiblingContinuation) {
          maxWidth += 1;
        }
        var repeatPrefix = "";
        if (this.repeatOptions.repeat != 0) {
          var repeatText = this.repeatOptions.repeat == -1 ? " \u221E " : " ".repeat(String(this.repeatOptions.repeat).length) + "1/" + this.repeatOptions.repeat + " ";
          repeatPrefix = " \u2514" + repeatText;
          maxWidth = Math.max(maxWidth, repeatPrefix.length + 2);
        }
        var terminalIndex = 0;
        encounteredTerminal = false;
        lineSpecs.forEach(function(spec) {
          var line = spec.base;
          if (spec.isTerminal) {
            var terminalLabel = terminalIndex === 0 ? "\u2510" : "\u2524";
            var dashCount2 = Math.max(1, maxWidth - spec.base.length - 1);
            line += " " + "\u2500".repeat(dashCount2) + terminalLabel;
            terminalIndex++;
            encounteredTerminal = true;
          } else if (encounteredTerminal) {
            var paddingNeeded = Math.max(0, maxWidth - spec.base.length);
            line += " ".repeat(paddingNeeded) + "\u2502";
          }
          _this.consoleLogText += line.trimEnd() + "\r\n";
        });
        if (repeatPrefix) {
          var dashCount = Math.max(1, maxWidth - repeatPrefix.length);
          this.consoleLogText += repeatPrefix + "\u2500".repeat(dashCount) + "\u2524\r\n";
        }
        this.consoleLogText += " ".repeat(maxWidth) + "\u2514\u2500 completed";
        return this.consoleLogText;
      };
      return Tree2;
    })()
  );
  function generateUuid() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  var WatchFunction = (
    /** @class */
    (function() {
      function WatchFunction2(arg, name, parent, child, onStartCallback, onCompleteCallback, onRejectCallback, onAbortCallback, onErrorCallback) {
        var _this = this;
        var _a;
        this._id = Sequence.nextFunctionId();
        this._uuid = generateUuid();
        this._isAborted = false;
        this._isFinished = false;
        this._isRejected = false;
        this._isRunning = false;
        this._abortOriginatedFromNested = false;
        this._startTime = 0;
        this._stopTime = 0;
        this._duration = 0;
        this._timeout = 0;
        this.abortController = new AbortController();
        this.abort = function(reason) {
          return _this.abortController.abort(reason || "manually aborted");
        };
        this.signal = this.abortController.signal;
        this.sequence = 0;
        this.reset = function() {
          _this.clearFunctionTimeout();
          _this._isAborted = false;
          _this._isFinished = false;
          _this._isRejected = false;
          _this._isRunning = false;
          _this._startTime = 0;
          _this._stopTime = 0;
          _this._duration = 0;
          _this.sequence = 0;
          _this._nestedGroupAbort = void 0;
          _this._abortOriginatedFromNested = false;
          _this.abortController = new AbortController();
          _this.signal = _this.abortController.signal;
          _this.abort = function(reason) {
            return _this.abortController.abort(reason || "manually aborted");
          };
          var self2 = _this;
          _this.signal.addEventListener("abort", function() {
            if (self2.onAbortCallback && !self2._isAborted) {
              self2.onAbortCallback.call(self2);
            }
          });
          _this.promiseStatus = {
            status: "not started",
            reason: void 0,
            value: void 0
          };
        };
        this["promiseStatus"] = {
          status: "not started",
          reason: void 0,
          value: void 0
        };
        var logger = ((_a = this.group) === null || _a === void 0 ? void 0 : _a.logger) || new Logger();
        if (typeof arg === "object") {
          this.f = function() {
            var result = arg.f();
            return result instanceof Promise ? result : Promise.resolve(result);
          };
          this.name = arg.name;
          this.parent = arg.parent;
          this.child = arg.child;
          this._timeout = arg.timeout || 0;
          this.onStartCallback = function() {
            this._isRunning = true;
            this._startTime = now();
            if (logger.useLogger) {
              logger.log('\u2500\u2500"'.concat(this.name, '" has started.'), void 0, this._uuid);
              logger.updateFunctionStatus(this._uuid, "running");
            }
            if (arg.onStartCallback)
              arg.onStartCallback.call(this);
          };
          this.onCompleteCallback = function() {
            if (this._isAborted) {
              return;
            }
            this._isFinished = true;
            this._isRunning = false;
            this._stopTime = now();
            this._duration = calcDuration(this._startTime, this._stopTime);
            if (logger.useLogger) {
              logger.log('\u2500\u2500"'.concat(this.name, '" has completed.'), void 0, this._uuid);
              logger.updateFunctionStatus(this._uuid, "resolved");
            }
            if (arg.onCompleteCallback)
              arg.onCompleteCallback.call(this);
          };
          this.onRejectCallback = function() {
            if (this._isAborted) {
              return;
            }
            this._isRejected = true;
            this._isFinished = true;
            this._isRunning = false;
            this._stopTime = now();
            this._duration = calcDuration(this._startTime, this._stopTime);
            if (logger.useLogger) {
              logger.warn('\u2500\u2500"'.concat(this.name, '" was rejected.'), void 0, this._uuid);
              logger.updateFunctionStatus(this._uuid, "rejected");
            }
            if (this._nestedGroupAbort) {
              this._abortOriginatedFromNested = true;
            }
            if (arg.onRejectCallback)
              arg.onRejectCallback.call(this);
            if (this.group && this.group.options.abortOnReject && this.group.options.repeat > 0 && this.group.options.runs < this.group.options.repeat) {
              var remainingRuns = this.group.options.repeat - this.group.options.runs;
              if (typeof this.group.onAbortRunsCallback === "function") {
                this.group.onAbortRunsCallback(this.group.options.runs, remainingRuns, "function rejected");
              }
            }
            if (arg.onAbortCallback) {
              arg.onAbortCallback.call(this);
            }
            if (this.group && this.group.options.abortOnReject) {
              this.group.onAbortCallback(this.name, this.promiseStatus.reason || "rejected", "reject");
            }
            if (this.group) {
              this.group.propagateAbort(this, this.promiseStatus.reason || "rejected", "reject");
            }
          };
          this.onAbortCallback = function() {
            if (this._isFinished)
              return;
            if (!this._isAborted) {
              arg.onAbortCallback && arg.onAbortCallback.call(this);
              if (this.group && this.group.options.abortOnAbort && this.group.options.repeat > 0 && this.group.options.runs < this.group.options.repeat) {
                var remainingRuns = this.group.options.repeat - this.group.options.runs;
                if (typeof this.group.onAbortRunsCallback === "function") {
                  this.group.onAbortRunsCallback(this.group.options.runs, remainingRuns, "function aborted");
                }
              }
              this.group.onAbortCallback && this.group.onAbortCallback(this.name, this.signal.reason || "aborted", "abort");
              if (this.group) {
                this.group.propagateAbort(this, this.signal.reason || "aborted", "abort");
              }
              if (this._nestedGroupAbort && !this._abortOriginatedFromNested) {
                var reason = this.signal.reason || "parent function aborted";
                if (logger.useLogger)
                  logger.log('\u2500\u2500Cascading abort to nested group from "'.concat(this.name, '": ').concat(reason));
                this._nestedGroupAbort(reason);
              }
            }
            this._isAborted = true;
            this._isRunning = false;
            this._stopTime = now();
            this._duration = calcDuration(this._startTime, this._stopTime);
            if (logger.useLogger) {
              logger.warn('\u2500\u2500"'.concat(this.name, '" was aborted.'), void 0, this._uuid);
              logger.updateFunctionStatus(this._uuid, "aborted");
            }
          };
        } else {
          this.f = function() {
            var result = arg();
            return result instanceof Promise ? result : Promise.resolve(result);
          };
          this.name = name;
          this.parent = parent;
          this.child = child;
          if (onStartCallback)
            this.onStartCallback = function() {
              this._isRunning = true;
              this._startTime = now();
              if (logger.useLogger) {
                logger.log('"'.concat(this.name, '" has started.'), void 0, this._uuid);
                logger.updateFunctionStatus(this._uuid, "running");
              }
              onStartCallback.call(this);
            };
          if (onCompleteCallback)
            this.onCompleteCallback = function() {
              this._isFinished = true;
              this._isRunning = false;
              this._stopTime = now();
              this._duration = calcDuration(this._startTime, this._stopTime);
              if (logger.useLogger) {
                logger.log('"'.concat(this.name, '" has completed.'), void 0, this._uuid);
                logger.updateFunctionStatus(this._uuid, "resolved");
              }
              onCompleteCallback.call(this);
            };
          if (onRejectCallback)
            this.onRejectCallback = function() {
              this._isRejected = true;
              this._isFinished = true;
              this._isRunning = false;
              this._stopTime = now();
              this._duration = calcDuration(this._startTime, this._stopTime);
              if (logger.useLogger) {
                logger.warn('"'.concat(this.name, '" was rejected.'), void 0, this._uuid);
                logger.updateFunctionStatus(this._uuid, "rejected");
              }
              if (this.group) {
                this.group.propagateAbort(this, this.promiseStatus.reason || "rejected", "reject");
              }
              onRejectCallback.call(this);
              if (onAbortCallback) {
                onAbortCallback.call(this);
              }
            };
          if (onAbortCallback)
            this.onAbortCallback = function() {
              if (this._isFinished)
                return;
              this._isAborted = true;
              this._isFinished = true;
              this._isRunning = false;
              this._stopTime = now();
              this._duration = calcDuration(this._startTime, this._stopTime);
              if (logger.useLogger) {
                logger.warn('"'.concat(this.name, '" was aborted d.'), void 0, this._uuid);
                logger.updateFunctionStatus(this._uuid, "aborted");
              }
              if (this.group) {
                this.group.propagateAbort(this, this.signal.reason || "aborted", "abort");
              }
              onAbortCallback.call(this);
            };
        }
        var self = this;
        var originalFunction = this.f;
        this.signal.addEventListener("abort", function() {
          if (self.onAbortCallback && !self._isAborted) {
            self.onAbortCallback.call(self);
          }
        });
        this.f = function() {
          return new Promise(function(resolve, reject) {
            if (self.signal.aborted) {
              reject(self.signal.reason || "already aborted");
              return;
            }
            self.signal.addEventListener("abort", function(signal) {
              self.clearFunctionTimeout();
              var reason = signal.currentTarget && signal.currentTarget.reason || "manually aborted.";
              reject(reason);
            });
            if (_this.timeout > 0) {
              self._timeoutId = setTimeout(function() {
                if (self._isRunning) {
                  logger.error('"'.concat(self.name, '" has timed out.'));
                  self.abort("function timeout");
                }
              }, _this.timeout);
              if (typeof self._timeoutId.unref === "function") {
                self._timeoutId.unref();
              }
            }
            var result = originalFunction();
            if (result && typeof result.abort === "function") {
              self._nestedGroupAbort = result.abort;
              if (logger.useLogger)
                logger.log('\u2500\u2500Detected nested group in "'.concat(self.name, '"'));
            }
            if (result instanceof Promise) {
              result.then(function(value) {
                self.clearFunctionTimeout();
                resolve(value);
              }).catch(function(err) {
                self.clearFunctionTimeout();
                reject(err);
              });
            } else {
              self.clearFunctionTimeout();
              resolve(result);
            }
          });
        };
      }
      Object.defineProperty(WatchFunction2.prototype, "id", {
        get: function() {
          return this._id;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "uuid", {
        get: function() {
          return this._uuid;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "isAborted", {
        get: function() {
          return this._isAborted;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "isFinished", {
        get: function() {
          return this._isFinished;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "isRejected", {
        get: function() {
          return this._isRejected;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "isRunning", {
        get: function() {
          return this._isRunning;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "hasNestedGroup", {
        get: function() {
          return typeof this._nestedGroupAbort === "function";
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "isProcessed", {
        get: function() {
          return this._isFinished || this._isRejected || this._isAborted;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "startTime", {
        get: function() {
          return this._startTime;
        },
        set: function(value) {
          this._startTime = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "stopTime", {
        get: function() {
          return this._stopTime;
        },
        set: function(value) {
          this._stopTime = value;
          this._duration = calcDuration(this._startTime, this._stopTime);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "duration", {
        get: function() {
          return Math.max(0, this._duration);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(WatchFunction2.prototype, "timeout", {
        get: function() {
          return this._timeout;
        },
        set: function(value) {
          this._timeout = value;
        },
        enumerable: false,
        configurable: true
      });
      WatchFunction2.prototype.clearFunctionTimeout = function() {
        if (this._timeoutId) {
          clearTimeout(this._timeoutId);
          this._timeoutId = void 0;
        }
      };
      Object.defineProperty(WatchFunction2.prototype, "metrics", {
        get: function() {
          return {
            id: this._id,
            uuid: this._uuid,
            name: this.name || "",
            start: Math.max(0, this.group ? this._startTime - this.group.startTime : 0),
            duration: this._duration,
            status: this.promiseStatus.status,
            value: this.promiseStatus.value,
            reason: this.promiseStatus.reason,
            isRunning: this._isRunning,
            isFinished: this._isFinished,
            isRejected: this._isRejected,
            isAborted: this._isAborted,
            sequence: this.sequence
          };
        },
        enumerable: false,
        configurable: true
      });
      return WatchFunction2;
    })()
  );
  var GroupRegistry = (
    /** @class */
    (function() {
      function GroupRegistry2() {
        this.groups = [];
      }
      GroupRegistry2.prototype.register = function(group) {
        this.groups.push(group);
      };
      GroupRegistry2.prototype.getAll = function() {
        return this.groups;
      };
      GroupRegistry2.prototype.clear = function() {
        this.groups = [];
      };
      return GroupRegistry2;
    })()
  );
  var groupRegistry = new GroupRegistry();
  var regexRepeat = function(repeat) {
    var length = repeat.toString().length;
    return " ".repeat(length) + "1/" + repeat + " ";
  };
  var __assign = function() {
    __assign = Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
      }
      return t;
    };
    return __assign.apply(this, arguments);
  };
  var Group = (
    /** @class */
    (function() {
      function Group2(options) {
        if (options === void 0) {
          options = { repeat: 0 };
        }
        var _this = this;
        var _a;
        this.options = { repeat: 0, runs: 0, abortOnReject: false, abortOnAbort: false, functionIdType: "short-id" };
        this._id = Sequence.nextGroupId();
        this._manualGroupAbort = false;
        this._functions = [];
        this._isTimedout = false;
        this._startTime = 0;
        this._stopTime = 0;
        this._duration = 0;
        this._timeout = 0;
        this._onStartCallback = function() {
        };
        this._onStartRunCallback = function() {
        };
        this._onCompleteCallback = function() {
        };
        this._onCompleteRunCallback = function() {
        };
        this._onRejectCallback = function() {
        };
        this._onRejectRunCallback = function() {
        };
        this._onAbortCallbackInvoked = false;
        this._onAbortCallback = function() {
        };
        this._onAbortRunCallback = function() {
        };
        this._onAbortRunsCallback = function() {
        };
        this.sequence = 0;
        this._onErrorCallback = function() {
        };
        this._onTimeoutCallback = function() {
        };
        this.addWatch = function(addWatchFunction) {
          var watchFunction;
          if (typeof addWatchFunction === "function") {
            watchFunction = new WatchFunction({
              f: addWatchFunction,
              name: "watch-function-".concat(_this.sequence + 1),
              parent: _this.sequence === 0 ? void 0 : "_monitor_".concat(_this.sequence),
              child: "_monitor_".concat(_this.sequence + 1),
              onStartCallback: function() {
              },
              onCompleteCallback: function() {
              },
              onRejectCallback: function() {
              },
              onAbortCallback: function() {
              }
            });
            _this.sequence++;
          } else {
            watchFunction = new WatchFunction(addWatchFunction);
          }
          watchFunction.group = _this;
          _this._functions.push(watchFunction);
        };
        this.options = __assign(__assign({}, options), { repeat: (_a = options.repeat) !== null && _a !== void 0 ? _a : 0, runs: 0, abortOnReject: options.abortOnReject || false, abortOnAbort: options.abortOnAbort || options.propagateOnAbort || false, functionIdType: options.functionIdType || "short-id" });
        this.logger = new Logger();
        Sequence.resetFunctionIdCounter();
        groupRegistry.register(this);
      }
      Object.defineProperty(Group2.prototype, "run", {
        get: function() {
          return this.options.repeat >= 0 ? this.options.runs : 0;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "useLogger", {
        get: function() {
          return this.logger.useLogger;
        },
        set: function(value) {
          this.logger.useLogger = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "propagateOnAbort", {
        // Alias for abortOnAbort to provide alternative API
        get: function() {
          return this.options.abortOnAbort || false;
        },
        set: function(value) {
          this.options.abortOnAbort = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "id", {
        get: function() {
          return this._id;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "manualGroupAbort", {
        get: function() {
          return this._manualGroupAbort;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "functions", {
        get: function() {
          return this._functions;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isRunning", {
        get: function() {
          return this._functions.some(function(fn) {
            return fn.isRunning;
          });
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isFinished", {
        get: function() {
          return this._functions.every(function(fn) {
            return fn.isFinished;
          });
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isRejected", {
        get: function() {
          return this._functions.some(function(fn) {
            return fn.isRejected;
          });
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isAborted", {
        get: function() {
          return this._functions.some(function(fn) {
            return fn.isAborted;
          });
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isTimedout", {
        get: function() {
          return this._isTimedout;
        },
        set: function(value) {
          this._isTimedout = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "isProcessed", {
        get: function() {
          return this.isFinished || this.isRejected || this.isAborted;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "startTime", {
        get: function() {
          return this._startTime;
        },
        set: function(value) {
          this._startTime = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "stopTime", {
        get: function() {
          return this._stopTime;
        },
        set: function(value) {
          this._stopTime = value;
          this._duration = calcDuration(this._startTime, this._stopTime);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "duration", {
        get: function() {
          return Math.max(0, this._duration);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "timeout", {
        get: function() {
          return this._timeout;
        },
        set: function(value) {
          this._timeout = value;
        },
        enumerable: false,
        configurable: true
      });
      Group2.prototype.clearGroupTimeout = function() {
        if (this._timeoutId) {
          clearTimeout(this._timeoutId);
          this._timeoutId = void 0;
        }
      };
      Object.defineProperty(Group2.prototype, "onStartCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a;
            _this.startTime = now();
            if (_this.options.repeat > 0) {
              _this.options.runs = 1;
            }
            if (_this.useLogger) {
              _this.logger.log('*** START "'.concat((_a = _this.name) !== null && _a !== void 0 ? _a : "Group#" + _this.id, '" ***'));
            }
            _this.logger.highlight("completed", { id: _this._id }, "start");
            _this.logger.highlight(regexRepeat(_this.options.repeat), { id: _this._id }, ["start", "repeat"]);
            _this._onStartCallback();
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onStartCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onStartRunCallback", {
        get: function() {
          var _this = this;
          return function() {
            if (_this.isRunning)
              return;
            if (_this.useLogger) {
              _this.logger.log('*** RUN "'.concat(_this.run, '" STARTED ***'));
            }
            _this._onStartRunCallback();
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onStartRunCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onCompleteCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a;
            _this.clearGroupTimeout();
            _this._onCompleteCallback();
            _this.stopTime = now();
            if (_this.useLogger) {
              _this.logger.log('*** COMPLETED "'.concat((_a = _this.name) !== null && _a !== void 0 ? _a : "Group#" + _this.id, '" ***'));
            }
            _this.logger.highlight("completed", { id: _this._id }, "complete");
            _this.logger.highlight(" " + _this.options.repeat + "/" + _this.options.repeat + " ", { id: _this._id }, ["complete"]);
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onCompleteCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onCompleteRunCallback", {
        get: function() {
          var _this = this;
          return function() {
            if (_this.useLogger) {
              _this.logger.log('*** RUN "'.concat(_this.run, '" COMPLETED ***'));
            }
            _this._onCompleteRunCallback();
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onCompleteRunCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onRejectCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a, _b;
            _this.stopTime = now();
            if (_this.isTimedout)
              return;
            if (_this.useLogger) {
              _this.logger.log('*** REJECTED "'.concat((_a = _this.name) !== null && _a !== void 0 ? _a : "Group#" + _this.id, '" ***'));
              _this.logger.log(_this.metrics);
            }
            _this.logger.highlight("completed", { id: _this._id, index: _this.sequence }, "complete");
            (_b = _this._onRejectCallback) === null || _b === void 0 ? void 0 : _b.call(_this);
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onRejectCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onRejectRunCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a;
            _this.stopTime = now();
            if (_this.useLogger) {
              _this.logger.log('*** REJECTED RUN "'.concat(_this.run, '" ***'));
              _this.logger.log(_this.metrics);
            }
            _this.logger.highlight("completed", { id: _this._id, index: _this.sequence }, "complete");
            (_a = _this._onRejectRunCallback) === null || _a === void 0 ? void 0 : _a.call(_this);
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onRejectRunCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onAbortCallback", {
        get: function() {
          var _this = this;
          return function(source, reason, triggerType) {
            var _a;
            _this.stopTime = now();
            if (_this._onAbortCallbackInvoked || _this.isTimedout)
              return;
            _this._onAbortCallbackInvoked = true;
            if (_this.useLogger) {
              _this.logger.log('*** ABORTED GROUP "'.concat((_a = _this.name) !== null && _a !== void 0 ? _a : "Group#" + _this.id, '" ***'));
            }
            _this.logger.highlight("completed", { id: _this._id }, "aborted");
            if (typeof _this._onAbortCallback === "function") {
              _this._onAbortCallback(source, reason, triggerType);
            }
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onAbortCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onAbortRunCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a;
            _this.stopTime = now();
            if (_this.useLogger) {
              _this.logger.log('*** ABORTED RUN "'.concat(_this.run, '" ***'));
            }
            _this.logger.highlight("completed", { id: _this._id }, "aborted");
            (_a = _this._onAbortRunCallback) === null || _a === void 0 ? void 0 : _a.call(_this);
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onAbortRunCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onAbortRunsCallback", {
        get: function() {
          var _this = this;
          return function(currentRun, remainingRuns, reason) {
            if (_this.useLogger) {
              _this.logger.log("*** ABORTING SUBSEQUENT RUNS (".concat(currentRun, "/").concat(_this.options.repeat, ") - ").concat(remainingRuns, " runs cancelled: ").concat(reason, " ***"));
            }
            if (typeof _this._onAbortRunsCallback === "function") {
              _this._onAbortRunsCallback(currentRun, remainingRuns, reason);
            }
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onAbortRunsCallback = value.bind(this);
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onErrorCallback", {
        get: function() {
          var _this = this;
          return function() {
            if (_this.useLogger) {
              _this.logger.log('*** ERROR in group "'.concat(_this.name || _this._id, '" ***'));
            }
            _this._onErrorCallback();
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onErrorCallback = value;
        },
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(Group2.prototype, "onTimeoutCallback", {
        get: function() {
          var _this = this;
          return function() {
            var _a;
            if (!!_this.isFinished)
              return;
            _this.isTimedout = true;
            if (_this.useLogger) {
              _this.logger.log('*** TIMEOUT in group "'.concat(_this.name || _this._id, '" ***'));
              _this.logger.highlight("completed", { id: _this._id }, "time out");
            }
            (_a = _this._onTimeoutCallback) === null || _a === void 0 ? void 0 : _a.call(_this);
          };
        },
        set: function(value) {
          if (typeof value === "function")
            this._onTimeoutCallback = value;
        },
        enumerable: false,
        configurable: true
      });
      Group2.prototype.abortWatch = function(name) {
        var watchFunction = this._functions.find(function(fn) {
          return fn.name === name;
        });
        if (watchFunction) {
          if (watchFunction.isRunning) {
            watchFunction.abort("manual aborted by user");
          } else {
            if (this.logger.useLogger) {
              this.logger.warn('+++ Watch function "'.concat(name, '" is not currently running and cannot be aborted.'));
            }
          }
        } else {
          if (this.logger.useLogger) {
            this.logger.warn('+++ No watch function found with name "'.concat(name, '"'));
          }
        }
      };
      Group2.prototype.abort = function(reason) {
        if (reason === void 0) {
          reason = "all functions aborted by user";
        }
        this._manualGroupAbort = true;
        this.clearGroupTimeout();
        if (typeof this.onAbortCallback === "function") {
          this.onAbortCallback("Group", reason, "manual");
        }
        this._functions.forEach(function(fn) {
          fn.abort(reason);
        });
      };
      Group2.prototype.propagateAbort = function(sourceFunction, reason, triggerType) {
        var propagationReason = 'propagated from "'.concat(sourceFunction.name, '" (').concat(triggerType, "): ").concat(reason);
        this._functions.forEach(function(fn) {
          if (fn.id !== sourceFunction.id && fn.isRunning) {
            fn.abort(propagationReason);
          }
        });
        if (this.useLogger) {
          this.logger.warn('+++ Abort propagated from "'.concat(sourceFunction.name, '" to remaining functions'));
        }
      };
      Group2.prototype.reset = function(resetRuns) {
        if (resetRuns === void 0) {
          resetRuns = true;
        }
        this.startTime = 0;
        this.stopTime = 0;
        this._onAbortCallbackInvoked = false;
        this._functions.forEach(function(fn) {
          return fn.reset();
        });
        if (resetRuns) {
          this.options.runs = 1;
        }
        this.logger.displayRepeat(this._id, this.options.runs || 0, this.options.repeat);
        this.logger.clearHighlights(this._id);
      };
      Group2.prototype.removeAll = function() {
        this._functions = [];
      };
      Group2.prototype.add = function() {
      };
      Group2.prototype.remove = function() {
      };
      Group2.prototype.watchAll = function() {
        var _this = this;
        if (this.logger.addToDocument())
          this.logger.log(this.loggerTree, ["tree", "tree-".concat(this.id)]);
        if (this.timeout > 0) {
          this._timeoutId = setTimeout(function() {
            _this.logger.warn("log: timeout on group");
            _this.abort("abort: timeout on group");
            _this.onTimeoutCallback();
          }, this.timeout);
          if (typeof this._timeoutId.unref === "function") {
            this._timeoutId.unref();
          }
        }
        if (this.functions.length === 0) {
          if (this.logger.useLogger) {
            this.logger.warn("No watch functions found in this group.");
          }
          return new Promise(function(resolve, reject) {
            reject("No watch functions found in this group.");
          });
        }
        if (this.isProcessed) {
          if (this.logger.useLogger) {
            this.logger.warn("This watchAll group has already been processed.");
          }
          return new Promise(function(resolve, reject) {
            reject("This watchAll group has already been processed.");
          });
        }
        if (this.isRunning) {
          if (this.logger.useLogger) {
            this.logger.warn("This watchAll group is already being monitored.");
          }
          return new Promise(function(resolve, reject) {
            reject("This watchAll group is already being monitored.");
          });
        }
        this.startTime = now();
        if (typeof this.onStartCallback === "function")
          this.onStartCallback();
        var promise = watchAll(this);
        if (promise) {
          promise.abort = this.abort.bind(this);
        }
        return promise;
      };
      Object.defineProperty(Group2.prototype, "loggerTree", {
        get: function() {
          this.buildTreeStructure();
          var treeData = this._functions.map(function(f, i, arr) {
            return {
              name: f.name,
              parent: f.parent,
              child: f.child,
              uuid: f.uuid,
              seq: f.id.toString()
            };
          });
          var treeBuilder = new Tree({ repeat: this.options.repeat });
          return treeBuilder.processTree(treeData);
        },
        enumerable: false,
        configurable: true
      });
      Group2.prototype.buildTreeStructure = function() {
        var _this = this;
        var sequence = 0;
        var assignSequence = function(parent) {
          var children = _this._functions.filter(function(f) {
            return f.parent === parent;
          });
          var uniqueChildren = children.map(function(x) {
            return x.child;
          }).filter(function(currentValue, index, arr) {
            return arr.indexOf(currentValue) === index;
          });
          uniqueChildren.forEach(function(childId) {
            sequence++;
            children.filter(function(c) {
              return c.child === childId;
            }).forEach(function(child) {
              child.sequence = sequence;
            });
            if (childId !== void 0) {
              assignSequence(childId);
            }
          });
        };
        assignSequence(void 0);
      };
      Object.defineProperty(Group2.prototype, "metrics", {
        get: function() {
          return this._functions.map(function(f) {
            return f.metrics;
          });
        },
        enumerable: false,
        configurable: true
      });
      return Group2;
    })()
  );
  var nextId = Sequence.nextId;
  var asyncMonitor = groupRegistry.getAll();
  if (typeof window !== "undefined") {
    window.asyncMonitor = asyncMonitor;
  }

  // src/monitor.js
  async function runChain(steps, options) {
    const group = new Group({ abortOnReject: true, ...options });
    const results = [];
    steps.forEach((step) => {
      group.addWatch(async () => {
        results.push(await step());
      });
    });
    await group.watchAll();
    return results;
  }

  // src/index.js
  function getToc(root = document) {
    const rows = extractTocData(root);
    const csv = toCsv(rows, ["Parent", "Child"]);
    downloadCsv(csv, `${getUrlPrefix(window.location)}.binder-toc.csv`);
    console.log(`Extracted ${rows.length} row(s).`);
    console.table(rows.map(([Parent, Child]) => ({ Parent, Child })));
    return rows;
  }
  function slugify(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function cloneWithInlineStyles(node) {
    const clone = node.cloneNode(true);
    const sourceWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    const cloneWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
    while (sourceWalker.nextNode() && cloneWalker.nextNode()) {
      const sourceEl = sourceWalker.currentNode;
      const cloneEl = cloneWalker.currentNode;
      const computed = getComputedStyle(sourceEl);
      const styleText = Array.from(computed).map((prop) => `${prop}:${computed.getPropertyValue(prop)};`).join("");
      cloneEl.setAttribute("style", styleText);
    }
    return clone;
  }
  async function focusedElementToPngBlob(element, scale = 2) {
    const rect = element.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const clone = cloneWithInlineStyles(element);
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
</svg>`;
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to render focused element to image."));
        img.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0, width, height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Failed to encode focused element image as PNG."));
        }, "image/png");
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }
  function focusedElementToSvgBlob(element) {
    const rect = element.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const clone = cloneWithInlineStyles(element);
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
</svg>`;
    return new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  }
  async function focusedElementToImageAsset(element, scale = 2) {
    try {
      const pngBlob = await focusedElementToPngBlob(element, scale);
      return { blob: pngBlob, extension: "png" };
    } catch (error) {
      const svgBlob = focusedElementToSvgBlob(element);
      return { blob: svgBlob, extension: "svg" };
    }
  }
  async function exportFocusedElementImagesFromToc(options = {}) {
    const {
      maxChildren,
      settleMs = 400,
      imageScale = 2,
      timeoutMs = 1e4
    } = options;
    const tocRows = extractTocData(document);
    const childNames = Array.from(new Set(tocRows.map(([, child]) => child).filter(Boolean)));
    const selectedChildren = Number.isInteger(maxChildren) && maxChildren > 0 ? childNames.slice(0, maxChildren) : childNames;
    if (selectedChildren.length === 0) {
      throw new Error("No TOC child sections found.");
    }
    const prefix = getUrlPrefix(window.location);
    const manifestRows = [];
    for (let i = 0; i < selectedChildren.length; i++) {
      const childName = selectedChildren[i];
      const childEl = Array.from(document.querySelectorAll(".binder__toc-element-name")).find((el) => el.textContent.trim() === childName);
      if (!childEl) {
        manifestRows.push([childName, "", "NOT_FOUND"]);
        continue;
      }
      const clickTarget = childEl.closest('.binder__toc-element, [role="button"], button, a') || childEl;
      clickTarget.click();
      await waitForCondition(() => document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR), timeoutMs);
      await new Promise((resolve) => setTimeout(resolve, settleMs));
      const focused = document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR);
      if (!focused) {
        manifestRows.push([childName, "", "NO_FOCUSED_ELEMENT"]);
        continue;
      }
      const imageAsset = await focusedElementToImageAsset(focused, imageScale);
      const filename = `${prefix}.focused-${String(i + 1).padStart(2, "0")}-${slugify(childName)}.${imageAsset.extension}`;
      downloadBlob(imageAsset.blob, filename);
      manifestRows.push([childName, filename, "OK"]);
    }
    const csv = toCsv(manifestRows, ["Child", "Image File", "Status"]);
    downloadCsv(csv, `${prefix}.focused-elements.csv`);
    console.log(`Exported ${manifestRows.length} focused-element image(s).`);
    console.table(manifestRows.map(([Child, ImageFile, Status]) => ({ Child, ImageFile, Status })));
    return manifestRows;
  }
  function extractTable(table, tableName) {
    const { headers, rows } = parseHtmlTable(table);
    const csv = toCsv(rows, headers);
    const filenameSuffix = tableName ? `table-${tableName}` : "table";
    downloadCsv(csv, `${getUrlPrefix(window.location)}.${filenameSuffix}.csv`);
    console.log(`Extracted ${rows.length} row(s) from table.`);
    console.table(rows.map((row) => Object.fromEntries(headers.map((header, i) => [header || `Column ${i + 1}`, row[i]]))));
    return rows;
  }
  function getTable(selector = "table", tableName) {
    const tables = Array.from(document.querySelectorAll(selector));
    const table = tables[tables.length - 1];
    if (!table) {
      throw new Error(`No element found matching selector "${selector}".`);
    }
    return extractTable(table, tableName);
  }
  async function getFieldsTable(link) {
    const existingTables = new Set(document.querySelectorAll("table"));
    const findNewTable = () => Array.from(document.querySelectorAll("table")).find((table) => !existingTables.has(table));
    const [, , rows] = await runChain([
      () => openToolbarPopup(link),
      () => waitForCondition(findNewTable, 1e4),
      () => link === "Fields" ? extractFieldsTableWithAttributes(findNewTable) : extractTable(findNewTable(), link),
      () => closePopup()
    ]);
    return rows;
  }
  async function extractFieldsTableWithAttributes(findNewTable) {
    const { headers: tableHeaders, rows: tableRows } = parseHtmlTable(findNewTable());
    const fieldNameIndex = tableHeaders.indexOf("Field");
    const typeIndex = tableHeaders.indexOf("Type");
    const headers = ["Field", "Type", "Attribute Name", "Attribute Value"];
    const rows = [];
    for (let i = 0; i < tableRows.length; i++) {
      const fieldName = tableRows[i][fieldNameIndex] ?? "";
      const fieldType = tableRows[i][typeIndex] ?? "";
      const tr = findNewTable().querySelectorAll("tbody tr")[i];
      const editButton = tr?.querySelector('button[aria-label="Edit field"]');
      if (!editButton) {
        rows.push([fieldName, fieldType, "", ""]);
        continue;
      }
      editButton.click();
      const form = await waitForCondition(() => document.querySelector("form.fieldFormAttributes"), 1e4);
      const attributePairs = parseFieldEditForm(form);
      (attributePairs.length ? attributePairs : [["", ""]]).forEach(([name, value]) => {
        rows.push([fieldName, fieldType, name, value]);
      });
      form.querySelector("#cancel")?.click();
      await waitForCondition(findNewTable, 1e4);
    }
    const csv = toCsv(rows, headers);
    downloadCsv(csv, `${getUrlPrefix(window.location)}.table-Fields.csv`);
    console.log(`Extracted ${rows.length} row(s) from Fields table with attributes.`);
    console.table(rows.map(([Field, Type, Name, Value]) => ({ Field, Type, "Attribute Name": Name, "Attribute Value": Value })));
    return rows;
  }
  var DEFAULT_POPUP_LABELS = ["Fields", "Properties"];
  async function getAllTables(labels = DEFAULT_POPUP_LABELS) {
    const results = await runChain(labels.map((label) => () => getFieldsTable(label)));
    return Object.fromEntries(labels.map((label, i) => [label, results[i]]));
  }
  var HISTORY_LIST_SELECTOR = ".history-list";
  var HISTORY_ROW_SELECTOR = ".record-browser-row";
  async function loadAllRows(container, rowSelector, timeoutMs = 15e3) {
    const start = Date.now();
    let lastCount = -1;
    let stableRounds = 0;
    while (Date.now() - start < timeoutMs && stableRounds < 2) {
      const count = container.querySelectorAll(rowSelector).length;
      stableRounds = count === lastCount ? stableRounds + 1 : 0;
      lastCount = count;
      container.scrollTop = container.scrollHeight;
      container.dispatchEvent(new Event("scroll", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    return Array.from(container.querySelectorAll(rowSelector));
  }
  function parseHistoryRow(row) {
    const name = row.querySelector(".user-info-name")?.textContent.trim() ?? "";
    const email = row.querySelector(".history-cell.name .smaller")?.textContent.trim() ?? "";
    const description = row.querySelector(".history-cell.description")?.textContent.trim() ?? "";
    const date = row.querySelector(".history-cell.date")?.textContent.trim() ?? "";
    return [name, email, description, date];
  }
  async function getHistoryRecords() {
    const headers = ["Name", "Email", "Description", "Date"];
    const [, , rows] = await runChain([
      () => openToolbarPopup("History"),
      () => waitForCondition(() => document.querySelector(`${HISTORY_LIST_SELECTOR} ${HISTORY_ROW_SELECTOR}`), 1e4),
      async () => {
        const container = document.querySelector(HISTORY_LIST_SELECTOR);
        const rowEls = await loadAllRows(container, HISTORY_ROW_SELECTOR);
        const data = rowEls.map(parseHistoryRow);
        const csv = toCsv(data, headers);
        downloadCsv(csv, `${getUrlPrefix(window.location)}.history.csv`);
        console.log(`Extracted ${data.length} row(s) from history.`);
        console.table(data.map((row) => Object.fromEntries(headers.map((header, i) => [header, row[i]]))));
        return data;
      },
      () => closePopup()
    ]);
    return rows;
  }
  var BINDER_ELEMENT_FOCUSED_SELECTOR = ".binder__element.binder__element--focused";
  var HIDDEN_COLUMN_ITEM_SELECTOR = '[data-testid^="dropdown-item-unhide-column-"]';
  async function waitForStableCount(selector, timeoutMs = 5e3) {
    const start = Date.now();
    let lastCount = -1;
    let stableRounds = 0;
    while (Date.now() - start < timeoutMs && stableRounds < 2) {
      const count = document.querySelectorAll(selector).length;
      stableRounds = count === lastCount ? stableRounds + 1 : 0;
      lastCount = count;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return Array.from(document.querySelectorAll(selector));
  }
  function getBinderElementIcons(el) {
    const groups = Array.from(el.querySelectorAll(".binder__element-header-controls"));
    const icons = [];
    groups.forEach((group) => {
      Array.from(group.querySelectorAll("button[aria-label], a[aria-label]")).forEach((control) => {
        icons.push(control.getAttribute("aria-label"));
      });
    });
    return icons;
  }
  function getVisibleTableHeaders(table) {
    const headerRow = table.querySelector('.header[role="row"]');
    if (!headerRow) {
      return [];
    }
    return Array.from(headerRow.querySelectorAll('[role="columnheader"]')).map((cell) => cell.textContent.trim()).filter(Boolean);
  }
  async function getHiddenTableHeaders(table) {
    const settingsButton = table.querySelector('button[aria-label="Table Settings"]');
    if (!settingsButton) {
      return [];
    }
    const wasOpen = !!document.querySelector(".dropdown-menu");
    if (!wasOpen) {
      settingsButton.click();
    }
    const [, , headers] = await runChain([
      () => waitForCondition(() => document.querySelector(".dropdown-menu"), 5e3),
      () => waitForStableCount(HIDDEN_COLUMN_ITEM_SELECTOR),
      () => Array.from(document.querySelectorAll(HIDDEN_COLUMN_ITEM_SELECTOR)).map((item) => item.querySelector(".grid-hidden-header div")?.textContent.trim()).filter(Boolean)
    ]);
    if (!wasOpen) {
      settingsButton.click();
    }
    return headers;
  }
  async function getElementMetadata() {
    const el = document.querySelector(BINDER_ELEMENT_FOCUSED_SELECTOR);
    if (!el) {
      throw new Error(`No element found matching selector "${BINDER_ELEMENT_FOCUSED_SELECTOR}".`);
    }
    const title = el.querySelector(".inline-input.primary")?.textContent.trim() ?? "";
    const icons = getBinderElementIcons(el);
    const table = el.querySelector(".hierarchical-table");
    const dataSource = table?.querySelector(".adt-external .data")?.textContent.trim();
    const visibleHeaders = table ? getVisibleTableHeaders(table) : [];
    const hiddenHeaders = table ? await getHiddenTableHeaders(table) : [];
    const headers = ["Type", "Value"];
    const rows = [
      ...icons.map((icon) => ["Icon", icon]),
      ...dataSource ? [["Data Source", dataSource]] : [],
      ...visibleHeaders.map((header) => ["TableHeader", header]),
      ...hiddenHeaders.map((header) => ["TableHeaderHidden", header])
    ];
    const csv = toCsv(rows, headers);
    downloadCsv(csv, `${getUrlPrefix(window.location)}.${title || "element"}-metadata.csv`);
    console.log(`Extracted metadata for "${title}": ${rows.length} row(s).`);
    console.table(rows.map(([Type, Value]) => ({ Type, Value })));
    return { title, rows };
  }
  window.extract = {
    ...window.extract,
    getToc,
    getTable,
    getFieldsTable,
    getAllTables,
    getHistoryRecords,
    getElementMetadata,
    exportFocusedElementImagesFromToc,
    openToolbarPopup,
    closePopup,
    runChain
  };
})();


extract.exportFocusedElementImagesFromToc()