/**
 * Searches information packages using the Zontal API.
 * @param {string} queryTerm - The term to search for (e.g., 'QAS4001').
 * @param {string} token - The Bearer authorization token.
 * @returns {Promise<Object>} The JSON response from the server.
 */
async function searchInformationPackages(queryTerm) {
  const url = `https://jnj.com{encodeURIComponent(queryTerm)}`;
  const token = "eyJhbGciOiJSUzI1NiIsInR5..."; // Paste your long token here

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch information packages:', error);
    throw error;
  }
}


searchInformationPackages('QAS3001-b')
  .then(data => console.log('Search Results:', data))
  .catch(err => console.error(err));

