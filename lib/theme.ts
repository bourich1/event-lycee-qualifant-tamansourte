export function getSchoolGradient(schoolName: string) {
  if (!schoolName) return 'linear-gradient(135deg, #13131a 0%, #1a1a2e 100%)' // default
  
  const lowerName = schoolName.toLowerCase();
  
  if (lowerName.includes('zahia') || lowerName.includes('zahya')) {
    return 'linear-gradient(135deg, #422006 0%, #a16207 100%)'; // Yellow
  }
  
  if (lowerName.includes('tamansourte')) {
    return 'linear-gradient(135deg, #172554 0%, #1e3a8a 100%)'; // Blue
  }
  
  // Other
  return 'linear-gradient(135deg, #022c22 0%, #065f46 100%)'; // Green
}

export function getSchoolColor(schoolName: string) {
  if (!schoolName) return '#6c5ce7' // default
  
  const lowerName = schoolName.toLowerCase();
  
  if (lowerName.includes('zahia') || lowerName.includes('zahya')) {
    return '#eab308'; // Yellow
  }
  
  if (lowerName.includes('tamansourte')) {
    return '#3b82f6'; // Blue
  }
  
  // Other
  return '#10b981'; // Green
}
