export type ShellPlan = "free" | "pro";

export type ShellSessionUser = {
  id: string;
  email: string | null;
};

export type ShellSessionProfile = {
  userId: string;
  email: string | null;
  plan: ShellPlan;
  credits: number | null;
};

export type ShellSession = {
  user: ShellSessionUser | null;
  profile: ShellSessionProfile | null;
  error: string | null;
};
