export function parseLRC(lrcString) {
  if (!lrcString) return [];

  const lines = lrcString.split("\n");
  const lyrics = [];

  // Regex to match [mm:ss.xx] or [mm:ss.xxx]
  const timeRegex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = trimmedLine.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;

      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;

      // Extract the text after the timestamp
      const text = trimmedLine.replace(timeRegex, "").trim();

      if (text) {
        lyrics.push({
          time: totalSeconds,
          text: text,
        });
      }
    }
  }

  // Sort by time just in case
  return lyrics.sort((a, b) => a.time - b.time);
}
