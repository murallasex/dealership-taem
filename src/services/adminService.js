// =====================================================
// AutoERP — Admin Pure Domain Service
// =====================================================

import { Users, Config, generateId, now } from '../core/store.js';

export function getUsersList() {
  return Users.all();
}

export function saveUserData(userData) {
  if (userData.id) {
    const existing = Users.find(userData.id);
    if (existing) {
      const updated = { ...existing, ...userData };
      if (!userData.password) updated.password = existing.password;
      return Users.save(updated);
    }
  }
  const newUser = {
    id: userData.id || generateId(),
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || 'seller',
    active: userData.active !== undefined ? userData.active : true,
    createdAt: userData.createdAt || now()
  };
  return Users.save(newUser);
}

export function toggleUserActiveStatus(userId) {
  const user = Users.find(userId);
  if (user) {
    user.active = !user.active;
    Users.save(user);
    return user;
  }
  return null;
}

export function deleteUserData(userId) {
  return Users.delete(userId);
}

export function getCompanyConfig() {
  return Config.get();
}

export function saveCompanyConfig(patch) {
  Config.update(patch);
  return Config.get();
}
