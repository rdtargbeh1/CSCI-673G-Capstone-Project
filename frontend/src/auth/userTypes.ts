// src/shared/types/userTypes

export interface UserDto {
  userId: string; // Unique identifier for a user
  firstName: string; // User's first name
  lastName: string; // User's last name
  userName: string; // Username
  position?: string | null; // Position
  email: string; // Email address
  phoneNumber?: string | null; // Optional phone number

  // status flags
  isActive: boolean; // User's activation status
  isVerified: boolean; // Whether the account is verified
  isSystemAdmin?: boolean; // platform flag (safe to show)

  roleName: string; // Role (e.g., Admin, Agent)

  partyId?: string | null; // Nullable party association
  assignedCountyId?: string | null; // Nullable assigned county
  defaultOrgId?: string | null; // Nullable default organization

  profileImageUrl?: string | null;
  profileImageUploadId?: string | null;
  // profilePictureUrl?: string | null; // Nullable profile image URL

  lastLogin?: string | null; // Nullable date of last login
  dateCreated?: string | null;
  dateUpdated?: string | null;
  failedLoginAttempts: number; // Count of failed login attempts
  lockedUntil?: string | null; // Nullable lock expiration
  lastPasswordChange?: string | null;
  signingKeyId?: string | null;
}

export interface UserCreateRequest {
  firstName: string;
  lastName: string;
  userName: string;
  position?: string;
  email: string;
  phoneNumber?: string;
  password: string;

  profileImageUrl?: string;
  profileImageUploadId?: string;

  roleName: RoleName;

  partyId?: string | null;
  assignedCountyId?: string | null;
  defaultOrgId?: string | null;
}

export interface UserUpdateRequest {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  position?: string;
  phoneNumber?: string;

  active?: boolean;
  verified?: boolean;

  profileImageUrl?: string;
  profileImageUploadId?: string;

  roleName: RoleName; // ✅ REQUIRED

  partyId?: string | null;
  assignedCountyId?: string | null;
  defaultOrgId?: string | null;
}

export interface FetchUsersResponse {
  users: UserDto[]; // Array of users
  totalElements: number; // Total number of users in the backend system
  totalPages: number;
  size: number;
  number: number; // current page
}

export interface OrgMembershipDto {
  membershipId: string;
  orgId: string;
  userId: string;
  roleName: string; // Role: e.g., ADMIN, PARTY_ADMIN, AGENT
  enabled: boolean; // Membership status
}

export type RoleName =
  | "SYSTEM_ADMIN"
  | "NEC_ADMIN"
  | "ADMIN"
  | "PARTY_ADMIN"
  | "AGENT"
  | "OBSERVER"
  | "SUPERVISOR"
  | "COORDINATOR"
  | "DATA_ENTRY"
  | "AUDITOR";
