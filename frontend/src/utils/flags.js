// Map team names → ISO 3166-1 alpha-2 country codes for flag emojis
const TEAM_FLAGS = {
  'United States': 'us', 'USA': 'us',
  'Canada': 'ca',
  'Mexico': 'mx',
  'Argentina': 'ar',
  'Brazil': 'br',
  'France': 'fr',
  'England': 'gb-eng',
  'Spain': 'es',
  'Germany': 'de',
  'Portugal': 'pt',
  'Netherlands': 'nl',
  'Belgium': 'be',
  'Uruguay': 'uy',
  'Colombia': 'co',
  'Japan': 'jp',
  'South Korea': 'kr',
  'Australia': 'au',
  'Morocco': 'ma',
  'Senegal': 'sn',
  'Nigeria': 'ng',
  'Ghana': 'gh',
  'Cameroon': 'cm',
  'Egypt': 'eg',
  'Saudi Arabia': 'sa',
  'Iran': 'ir',
  'Qatar': 'qa',
  'Switzerland': 'ch',
  'Croatia': 'hr',
  'Poland': 'pl',
  'Serbia': 'rs',
  'Denmark': 'dk',
  'Ecuador': 'ec',
  'Senegal': 'sn',
  'Wales': 'gb-wls',
  'Costa Rica': 'cr',
  'Tunisia': 'tn',
  'Cameroon': 'cm',
  'Chile': 'cl',
  'Paraguay': 'py',
  'Venezuela': 've',
  'Peru': 'pe',
  'Panama': 'pa',
  'Honduras': 'hn',
  'Jamaica': 'jm',
  'El Salvador': 'sv',
  'Trinidad and Tobago': 'tt',
  'Algeria': 'dz',
  'Ivory Coast': 'ci',
  'Mali': 'ml',
  'New Zealand': 'nz',
  'Guatemala': 'gt',
}

export function getFlagEmoji(teamName) {
  const code = TEAM_FLAGS[teamName]
  if (!code) return '🏳️'
  if (code.startsWith('gb-')) {
    const sub = code.split('-')[1]
    return `https://flagcdn.com/24x18/${code}.png`
  }
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1A5 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function getFlagUrl(teamName, size = 32) {
  const code = TEAM_FLAGS[teamName]
  if (!code) return null
  return `https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${code}.png`
}
