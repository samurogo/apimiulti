// src/adapters/user/LoginUserAdapter.ts

import { UserRepository } from '../../ports/user/UserRepository';

export class LoginUserAdapter {
  constructor(private userRepository: UserRepository) {}

  async execute(email: string, password: string): Promise<string | null> {
    const user = await this.userRepository.findByEmail(email);
    if (user && user.password === password) {
      const token = generateToken(user.id, user.email);
      return token;
    }
    return null;
  }
}

function generateToken(userId: string, email: string): string {
  return `JWT ${userId}:${email}`;
}