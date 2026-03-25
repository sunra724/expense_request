const units = ["", "만", "억", "조"];
const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const smallUnits = ["", "십", "백", "천"];

function chunkToKorean(chunk: number) {
  let result = "";
  const chars = chunk.toString().padStart(4, "0").split("").map(Number);
  chars.forEach((digit, index) => {
    if (digit === 0) return;
    const small = smallUnits[3 - index];
    result += `${digit === 1 && small ? "" : digits[digit]}${small}`;
  });
  return result;
}

export function numberToKorean(value: number) {
  if (!value) return "영";
  const parts: string[] = [];
  let target = Math.floor(value);
  let unitIndex = 0;

  while (target > 0) {
    const chunk = target % 10000;
    if (chunk > 0) {
      parts.unshift(`${chunkToKorean(chunk)}${units[unitIndex]}`);
    }
    target = Math.floor(target / 10000);
    unitIndex += 1;
  }

  return parts.join("");
}
