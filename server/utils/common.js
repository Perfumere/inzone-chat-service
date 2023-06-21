export function parseJSON(str) {
  try {
    return JSON.parse(str.toString());
  }
  catch (e) {
    return {};
  }
}
