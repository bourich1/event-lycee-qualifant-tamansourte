export function getSchoolGradient(schoolName: string) {
  if (!schoolName) return 'linear-gradient(135deg, #13131a 0%, #1a1a2e 100%)' // default
  
  const hash = schoolName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  // A set of elegant dark gradients based on the school name
  const gradients = [
    'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', // Deep slate to indigo
    'linear-gradient(135deg, #172554 0%, #082f49 100%)', // Deep blue
    'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)', // Deep violet
    'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', // Deep emerald
    'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', // Deep red
    'linear-gradient(135deg, #451a03 0%, #78350f 100%)', // Deep amber/brown
    'linear-gradient(135deg, #0a0a0a 0%, #27272a 100%)', // Midnight
  ]
  
  return gradients[hash % gradients.length]
}

export function getSchoolColor(schoolName: string) {
  if (!schoolName) return '#6c5ce7' // default purple
  
  const hash = schoolName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  const colors = [
    '#3b82f6', // blue
    '#0ea5e9', // cyan
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#ef4444', // red
    '#f59e0b', // amber
    '#71717a', // zinc
  ]
  
  return colors[hash % colors.length]
}
