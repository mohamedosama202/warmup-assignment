const fs = require('fs');


// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Converts "6:30:00 am" into total seconds
function timeToSeconds(timeStr) {
  timeStr = timeStr.trim().toLowerCase();

  let parts = timeStr.split(' ');
  let period = parts[1];
  let timeParts = parts[0].split(':');

  let hours = parseInt(timeParts[0]);
  let minutes = parseInt(timeParts[1]);
  let seconds = parseInt(timeParts[2]);

  if (period === 'am') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours = hours + 12;
  }

  return (hours * 3600) + (minutes * 60) + seconds;
}

// Converts "3:30:10" into total seconds
function durationToSeconds(durationStr) {
  durationStr = durationStr.trim();
  let parts = durationStr.split(':');
  let hours = parseInt(parts[0]);
  let minutes = parseInt(parts[1]);
  let seconds = parseInt(parts[2]);
  return (hours * 3600) + (minutes * 60) + seconds;
}

// Converts total seconds into "h:mm:ss"
function secondsToString(totalSeconds) {
  let hours = Math.floor(totalSeconds / 3600);
  let minutes = Math.floor((totalSeconds % 3600) / 60);
  let seconds = totalSeconds % 60;
  return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

// Reads a file and returns an array of non-empty lines
function readLines(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').filter(line => line.trim() !== '');
}


// ============================================================
// FUNCTION 1: getShiftDuration
// ============================================================
function getShiftDuration(startTime, endTime) {
  let startSeconds = timeToSeconds(startTime);
  let endSeconds = timeToSeconds(endTime);
  if (endSeconds < startSeconds) endSeconds += 24 * 3600;
  return secondsToString(endSeconds - startSeconds);
}


// ============================================================
// FUNCTION 2: getIdleTime
// ============================================================
function getIdleTime(startTime, endTime) {
  let startSeconds = timeToSeconds(startTime);
  let endSeconds = timeToSeconds(endTime);

  const deliveryStart = 8 * 3600;   // 8:00 AM
  const deliveryEnd = 22 * 3600;    // 10:00 PM

  let idleTime = 0;

  if (startSeconds < deliveryStart) {
    idleTime += Math.min(endSeconds, deliveryStart) - startSeconds;
  }

  if (endSeconds > deliveryEnd) {
    idleTime += endSeconds - Math.max(startSeconds, deliveryEnd);
  }

  return secondsToString(idleTime);
}


// ============================================================
// FUNCTION 3: getActiveTime
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
  let shiftSeconds = durationToSeconds(shiftDuration);
  let idleSeconds = durationToSeconds(idleTime);
  return secondsToString(shiftSeconds - idleSeconds);
}


// ============================================================
// FUNCTION 4: metQuota
// ============================================================
function metQuota(date, activeTime) {
  const normalQuota = (8 * 3600) + (24 * 60);
  const eidQuota = 6 * 3600;

  let dateParts = date.trim().split('-');
  let year = parseInt(dateParts[0]);
  let month = parseInt(dateParts[1]);
  let day = parseInt(dateParts[2]);

  let quota = (year === 2025 && month === 4 && day >= 10 && day <= 30) ? eidQuota : normalQuota;

  return durationToSeconds(activeTime) >= quota;
}


// ============================================================
// FUNCTION 5: addShiftRecord
// ============================================================
function addShiftRecord(textFile, shiftObj) {
  const { driverID, driverName, date, startTime, endTime } = shiftObj;

  let lines = [];
  try {
    lines = readLines(textFile);
  } catch (e) {
    lines = [];
  }

  // Check for duplicate using .some() — like exercise 1-12
  let isDuplicate = lines.some(line => {
    let cols = line.split(',');
    return cols[0].trim() === driverID.trim() && cols[2].trim() === date.trim();
  });

  if (isDuplicate) return {};

  // Calculate all fields
  let shiftDuration = getShiftDuration(startTime, endTime);
  let idleTime = getIdleTime(startTime, endTime);
  let activeTime = getActiveTime(shiftDuration, idleTime);
  let quota = metQuota(date, activeTime);
  let hasBonus = false;

  let newRecord = {
    driverID, driverName, date,
    startTime: startTime.trim(),
    endTime: endTime.trim(),
    shiftDuration, idleTime, activeTime,
    metQuota: quota, hasBonus
  };

  let newLine = `${driverID},${driverName},${date},${startTime.trim()},${endTime.trim()},${shiftDuration},${idleTime},${activeTime},${quota},${hasBonus}`;

  // Find last index of this driverID using reduce — like exercise 1-13
  let lastIndex = lines.reduce((acc, line, index) => {
    let cols = line.split(',');
    return cols[0].trim() === driverID.trim() ? index : acc;
  }, -1);

  if (lastIndex === -1) {
    lines.push(newLine);
  } else {
    lines.splice(lastIndex + 1, 0, newLine);
  }

  fs.writeFileSync(textFile, lines.join('\n') + '\n', 'utf8');
  return newRecord;
}


// ============================================================
// FUNCTION 6: setBonus
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
  let content = fs.readFileSync(textFile, 'utf8');
  let lines = content.split('\n');

  // Use map to update the matching line — like exercise 1-8
  let updatedLines = lines.map(line => {
    if (line.trim() === '') return line;
    let cols = line.split(',');
    if (cols[0].trim() === driverID.trim() && cols[2].trim() === date.trim()) {
      cols[9] = String(newValue);
      return cols.join(',');
    }
    return line;
  });

  fs.writeFileSync(textFile, updatedLines.join('\n'), 'utf8');
}


// ============================================================
// FUNCTION 7: countBonusPerMonth
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
  let lines = readLines(textFile);
  let targetMonth = parseInt(month);

  // Check if driver exists using .some() — like exercise 1-12
  let driverExists = lines.some(line => line.split(',')[0].trim() === driverID.trim());
  if (!driverExists) return -1;

  // Filter lines for this driver and month, then count bonuses — like exercises 1-9, 1-11
  let driverLines = lines.filter(line => {
    let cols = line.split(',');
    let recordMonth = parseInt(cols[2].trim().split('-')[1]);
    return cols[0].trim() === driverID.trim() && recordMonth === targetMonth;
  });

  let bonusLines = driverLines.filter(line => {
    let cols = line.split(',');
    return cols[9].trim().toLowerCase() === 'true';
  });

  return bonusLines.length;
}


// ============================================================
// FUNCTION 8: getTotalActiveHoursPerMonth
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
  let lines = readLines(textFile);
  let targetMonth = parseInt(month);

  // Filter lines for this driver and month — like exercise 1-9
  let matchingLines = lines.filter(line => {
    let cols = line.split(',');
    let recordMonth = parseInt(cols[2].trim().split('-')[1]);
    return cols[0].trim() === driverID.trim() && recordMonth === targetMonth;
  });

  // Sum up all active times using reduce — like exercise 1-7
  let totalSeconds = matchingLines.reduce((acc, line) => {
    let cols = line.split(',');
    return acc + durationToSeconds(cols[7].trim());
  }, 0);

  return secondsToString(totalSeconds);
}


// ============================================================
// FUNCTION 9: getRequiredHoursPerMonth
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
  let shiftLines = readLines(textFile);
  let rateLines = readLines(rateFile);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const normalQuota = (8 * 3600) + (24 * 60);
  const eidQuota = 6 * 3600;
  let targetMonth = parseInt(month);

  // Find driver's day off — like exercise 1-15 object searching
  let driverRate = rateLines.find(line => line.split(',')[0].trim() === driverID.trim());
  let dayOff = driverRate ? driverRate.split(',')[1].trim().toLowerCase() : '';

  // Filter shift lines for this driver and month
  let matchingLines = shiftLines.filter(line => {
    let cols = line.split(',');
    let recordMonth = parseInt(cols[2].trim().split('-')[1]);
    return cols[0].trim() === driverID.trim() && recordMonth === targetMonth;
  });

  // Sum required hours, skipping days off — like exercise 1-7 reduce
  let totalRequired = matchingLines.reduce((acc, line) => {
    let cols = line.split(',');
    let dateParts = cols[2].trim().split('-');
    let year = parseInt(dateParts[0]);
    let mon = parseInt(dateParts[1]);
    let day = parseInt(dateParts[2]);

    let dayName = dayNames[new Date(year, mon - 1, day).getDay()];
    if (dayName === dayOff) return acc; // skip day off

    let quota = (year === 2025 && mon === 4 && day >= 10 && day <= 30) ? eidQuota : normalQuota;
    return acc + quota;
  }, 0);

  let bonusDeduction = bonusCount * 2 * 3600;
  totalRequired = Math.max(0, totalRequired - bonusDeduction);

  return secondsToString(totalRequired);
}


// ============================================================
// FUNCTION 10: getNetPay
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
  let rateLines = readLines(rateFile);

  // Find driver data — like exercise 1-15 searching
  let driverRate = rateLines.find(line => line.split(',')[0].trim() === driverID.trim());
  if (!driverRate) return 0;

  let cols = driverRate.split(',');
  let basePay = parseInt(cols[2].trim());
  let tier = parseInt(cols[3].trim());

  // Allowed missing hours per tier
  const allowedHours = { 1: 50, 2: 20, 3: 10, 4: 3 };
  let allowedSeconds = (allowedHours[tier] || 0) * 3600;

  let actualSeconds = durationToSeconds(actualHours);
  let requiredSeconds = durationToSeconds(requiredHours);

  if (actualSeconds >= requiredSeconds) return basePay;

  let missingSeconds = requiredSeconds - actualSeconds;
  let billableSeconds = missingSeconds - allowedSeconds;

  if (billableSeconds <= 0) return basePay;

  let billableHours = Math.floor(billableSeconds / 3600);
  let deductionRatePerHour = Math.floor(basePay / 185);
  let salaryDeduction = billableHours * deductionRatePerHour;

  return basePay - salaryDeduction;
}


// ============================================================
// Export all functions
// ============================================================
module.exports = {
  getShiftDuration,
  getIdleTime,
  getActiveTime,
  metQuota,
  addShiftRecord,
  setBonus,
  countBonusPerMonth,
  getTotalActiveHoursPerMonth,
  getRequiredHoursPerMonth,
  getNetPay
};
