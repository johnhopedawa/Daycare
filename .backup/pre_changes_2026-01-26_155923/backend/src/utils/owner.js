function getOwnerId(user) {
  if (!user) {
    return null;
  }

  if (user.role === 'ADMIN') {
    return user.id;
  }

  if (user.created_by) {
    return user.created_by;
  }

  return user.id;
}

module.exports = { getOwnerId };
