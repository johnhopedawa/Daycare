const DEVELOPER_PASSWORD = '123';
const DEVELOPER_UNLOCK_KEY = 'developerUnlocked';

const hasStorage = () => typeof window !== 'undefined' && window.localStorage;

const setDeveloperUnlocked = () => {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.setItem(DEVELOPER_UNLOCK_KEY, 'true');
};

const isDeveloperUnlocked = () => {
  if (!hasStorage()) {
    return false;
  }
  return window.localStorage.getItem(DEVELOPER_UNLOCK_KEY) === 'true';
};

const clearDeveloperUnlocked = () => {
  if (!hasStorage()) {
    return;
  }
  window.localStorage.removeItem(DEVELOPER_UNLOCK_KEY);
};

export {
  DEVELOPER_PASSWORD,
  setDeveloperUnlocked,
  isDeveloperUnlocked,
  clearDeveloperUnlocked,
};
