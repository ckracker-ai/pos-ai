export type JwtPayload = {
  userId: string;
  roles: string[];
  branchId?: string;
};
