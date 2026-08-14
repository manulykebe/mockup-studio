function getIssuesFromIssueList() {
  const list = document.querySelector("ol.issue-list");
  if (!list) return [];

  const keyRegex = /\bJGVT-\d+\b/gi;

  const getAllCandidateStrings = (li) => {
    const values = [];

    // 1) Full visible text
    values.push(li.innerText || "");
    values.push(li.textContent || "");

    // 2) All links and attributes
    li.querySelectorAll("a").forEach((a) => {
      values.push(a.textContent || "");
      values.push(a.getAttribute("href") || "");
      values.push(a.href || "");
      values.push(a.getAttribute("data-issue-key") || "");
    });

    // 3) Any data-* attributes on any descendant
    li.querySelectorAll("*").forEach((el) => {
      for (const attr of el.attributes) {
        if (attr.name.startsWith("data-")) {
          values.push(attr.value || "");
        }
      }
    });

    // 4) Raw HTML as fallback
    values.push(li.outerHTML || "");

    return values;
  };

  const extractKey = (li) => {
    const candidates = getAllCandidateStrings(li);

    for (const text of candidates) {
      const matches = text.match(keyRegex);
      if (matches && matches.length) {
        // first valid key found
        return matches[0].toUpperCase();
      }
    }

    return null;
  };

  return Array.from(list.querySelectorAll("li")).map((li, index) => {
    const key = extractKey(li);

    // best-effort URL
    const keyLink =
      li.querySelector('a[href*="/browse/JGVT-"]') ||
      li.querySelector("a.issue-link") ||
      li.querySelector("a");

    const rawHref = keyLink?.getAttribute("href") || "";
    const url = keyLink ? new URL(rawHref || keyLink.href, location.origin).href : null;

    return {
      index: index + 1,
      key: key,
      url: url,
      summary: (li.innerText || li.textContent || "").trim().replace(/\s+/g, " ")
    };
  });
}


// usage
const issues = getIssuesFromIssueList();
console.log(JSON.stringify(issues, null, 2));

function openIssueXmlWindows() {
  const issues = getIssuesFromIssueList();

  // Keep only valid keys like JGVT-2663
  const keys = issues
    .map((x) => x.key)
    .filter((k) => typeof k === "string" && /^JGVT-\d+$/i.test(k))
    .map((k) => k.toUpperCase());

  // Remove duplicates
  const uniqueKeys = [...new Set(keys)];

  // Open all windows synchronously in the same user gesture.
  // Using unique names forces separate windows/tabs instead of reusing one.
  const blockedKeys = [];
  uniqueKeys.forEach((key, i) => {
    const url = "https://jira.jnj.com/si/jira.issueviews:issue-xml/" + key + "/" + key + ".xml";
    const popup = window.open("", "jira_xml_" + i, "popup=yes,width=1200,height=900");

    if (!popup) {
      blockedKeys.push(key);
      return;
    }

    popup.location.href = url;
  });

  return {
    totalItems: issues.length,
    requested: uniqueKeys.length,
    opened: uniqueKeys.length - blockedKeys.length,
    blocked: blockedKeys.length,
    blockedKeys,
    keys: uniqueKeys
  };
}

function openBlockedIssueXmlWindowsOneByOne(blockedKeys) {
  const queue = Array.isArray(blockedKeys)
    ? blockedKeys.filter((k) => typeof k === "string" && /^JGVT-\d+$/i.test(k)).map((k) => k.toUpperCase())
    : [];

  if (!queue.length) {
    console.log("No blocked keys to retry.");
    return;
  }

  function openNext() {
    if (!queue.length) {
      document.removeEventListener("click", openNext, true);
      console.log("Done: all previously blocked issue XML windows were opened.");
      return;
    }

    const key = queue.shift();
    const url = "https://jira.jnj.com/si/jira.issueviews:issue-xml/" + key + "/" + key + ".xml";
    const popup = window.open("", "jira_xml_retry_" + key, "popup=yes,width=1200,height=900");

    if (popup) {
      popup.location.href = url;
      console.log("Opened:", key, "| Remaining:", queue.length);
    } else {
      // Re-queue if still blocked so user can retry next click.
      queue.unshift(key);
      console.log("Still blocked by browser:", key, "| Click again after allowing popups.");
    }
  }

  document.addEventListener("click", openNext, true);
  console.log(
    "Retry mode enabled. Click anywhere",
    queue.length,
    "time(s) to open remaining blocked windows one-by-one.",
    "Remaining keys:",
    queue
  );
}

function runOpenIssueXmlWindowsReliable() {
  const result = openIssueXmlWindows();
  console.log("Initial open result:", result);

  if (result.blocked > 0) {
    openBlockedIssueXmlWindowsOneByOne(result.blockedKeys);
  }

  return result;
}

// Run manually from a single user action:
// 1) Execute this script
// 2) Click once anywhere in the page
//    (or call openIssueXmlWindows() directly from a click handler)
function runOpenIssueXmlWindowsOnNextClick() {
  function once() {
    document.removeEventListener("click", once, true);
    const result = runOpenIssueXmlWindowsReliable();
    console.log("Open result:", result);
  }

  document.addEventListener("click", once, true);
  console.log("Ready: click once on the page to open all issue XML windows.");
}