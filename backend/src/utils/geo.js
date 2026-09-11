// haversine 公式计算两个经纬度坐标之间的距离（米）
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// UTC+8 当前日期字符串 "YYYY-MM-DD"
function todayDateCN() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = { haversineDistance, todayDateCN };
