export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewUser = {
  email: string;
  passwordHash: string;
  name: string;
};
