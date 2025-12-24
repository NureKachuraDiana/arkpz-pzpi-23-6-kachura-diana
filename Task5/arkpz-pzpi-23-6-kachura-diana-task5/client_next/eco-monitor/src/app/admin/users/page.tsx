"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/api";
import type { User, ChangeUserRoleRequest } from "@/api/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  UserCog,
  Eye,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      console.error("Error loading users:", err);
      let errorMessage = "Failed to load users. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = useCallback(async () => {
    if (!searchEmail.trim()) {
      setFilteredUsers(users);
      return;
    }

    setIsLoading(true);
    try {
      const user = await apiService.getUserByEmail(searchEmail.trim());
      setFilteredUsers([user]);
    } catch (err) {
      console.error("Error searching user:", err);
      let errorMessage = "User not found.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 404) {
          errorMessage = "User with this email not found.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Search Error",
        description: errorMessage,
      });
      setFilteredUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchEmail, toast]);

  const handleBlockUser = useCallback(async (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You cannot block your own account.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const updatedUser = await apiService.blockUser(user.id.toString());
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );
      toast({
        title: "Success",
        description: `User ${updatedUser.email} has been blocked.`,
      });
    } catch (err) {
      console.error("Error blocking user:", err);
      let errorMessage = "Failed to block user. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentUser, toast]);

  const handleUnblockUser = useCallback(async (user: User) => {
    setIsProcessing(true);
    try {
      const updatedUser = await apiService.unblockUser(user.id.toString());
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updatedUser : u))
      );
      toast({
        title: "Success",
        description: `User ${updatedUser.email} has been unblocked.`,
      });
    } catch (err) {
      console.error("Error unblocking user:", err);
      let errorMessage = "Failed to unblock user. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You cannot delete your own account.",
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      return;
    }

    setIsProcessing(true);
    try {
      await apiService.deleteUser(selectedUser.id.toString());
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setFilteredUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      toast({
        title: "Success",
        description: `User ${selectedUser.email} has been deleted.`,
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      let errorMessage = "Failed to delete user. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  }, [selectedUser, currentUser, toast]);

  const handleChangeRole = useCallback(async () => {
    if (!selectedUser || !selectedRole) return;

    setIsProcessing(true);
    try {
      // Convert uppercase Role to lowercase UserRole for the request type
      const roleMap: Record<string, "admin" | "user" | "viewer" | "operator"> = {
        ADMIN: "admin",
        OPERATOR: "operator",
        OBSERVER: "viewer",
      };
      
      const changeRoleRequest: ChangeUserRoleRequest = {
        id: selectedUser.id.toString(),
        role: roleMap[selectedRole] || "viewer",
      };
      
      const updatedUser = await apiService.changeUserRole(changeRoleRequest);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? updatedUser : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? updatedUser : u))
      );
      toast({
        title: "Success",
        description: `User role has been updated to ${updatedUser.role}.`,
      });
    } catch (err) {
      console.error("Error changing user role:", err);
      let errorMessage = "Failed to change user role. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
    }
  }, [selectedUser, selectedRole, toast]);

  const handleUserClick = useCallback((user: User) => {
    router.push(`/admin/users/${user.id}/activity`);
  }, [router]);

  const handleOpenRoleDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "destructive";
      case "OPERATOR":
        return "default";
      case "OBSERVER":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users, roles, and account status
          </p>
        </div>
        <Button
          onClick={loadUsers}
          variant="outline"
          disabled={isLoading || isProcessing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search by email..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || isProcessing}
            variant="outline"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          {searchEmail && (
            <Button
              onClick={() => {
                setSearchEmail("");
                setFilteredUsers(users);
              }}
              variant="ghost"
              disabled={isLoading || isProcessing}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading users...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleUserClick(user)}
                >
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {user.firstName || user.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Active" : "Blocked"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.lastLogin)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleUserClick(user)}
                        title="View Activity Logs"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user.isActive ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleBlockUser(user)}
                          disabled={isProcessing || user.id === currentUser?.id}
                          title="Block User"
                        >
                          <ShieldOff className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleUnblockUser(user)}
                          disabled={isProcessing}
                          title="Unblock User"
                        >
                          <Shield className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenRoleDialog(user)}
                        disabled={isProcessing}
                        title="Change Role"
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDeleteDialog(user)}
                        disabled={isProcessing || user.id === currentUser?.id}
                        title="Delete User"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user{" "}
              <strong>{selectedUser?.email}</strong>? This action cannot be
              undone and will permanently remove the user from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for user <strong>{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="OPERATOR">OPERATOR</SelectItem>
                <SelectItem value="OBSERVER">OBSERVER</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangeRole}
              disabled={isProcessing || !selectedRole}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

