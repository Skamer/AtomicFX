export const extractId = (s: string): number => {
  if (s.startsWith("id:")) {
    return Number(s.substring(3));
  } else {
    return Number(s);
  }
};

export const chunk = <T>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export const isValidJSON = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};
