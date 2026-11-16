import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { schoolInvitesApi, codesApi } from "../api";
import { formatDate } from "../lib/utils";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import toast from "react-hot-toast";
import { Users, Search, UserX, AlertCircle, User } from "lucide-react";

export default function StudentsPage() {
  const { school } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "active" | "expired" | "revoked"
  >("all");

  const { data: students, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["students", school?.$id],
    queryFn: () => schoolInvitesApi.listStudents(school!.$id),
    enabled: !!school?.$id,
    staleTime: 0,
  });

  const { data: codes } = useQuery({
    queryKey: ["codes", school?.$id],
    queryFn: () => codesApi.getAll(school!.$id),
    enabled: !!school?.$id,
  });

  const revokeMutation = useMutation({
    mutationFn: ({
      studentId,
    }: {
      studentId: string;
    }) => schoolInvitesApi.revokeStudent(school!.$id, studentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students", school?.$id] }),
        queryClient.invalidateQueries({ queryKey: ["codes", school?.$id] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", school?.$id] }),
        queryClient.invalidateQueries({ queryKey: ["code-students"] }),
      ]);
      toast.success("Student access revoked");
    },
    onError: (error) => toast.error(error.message || "Failed to revoke access"),
  });

  const extendMutation = useMutation({
    mutationFn: ({ studentId, expectedExpiresAt }: { studentId: string; expectedExpiresAt: string }) =>
      schoolInvitesApi.extendStudent(school!.$id, studentId, expectedExpiresAt),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students", school?.$id] }),
        queryClient.invalidateQueries({ queryKey: ["code-students"] }),
      ]);
      toast.success("Student access extended");
    },
    onError: (error) => toast.error(error.message || "Failed to extend access"),
  });

  const isUpdatingAccess = revokeMutation.isPending || extendMutation.isPending;

  const getCodeInfo = (codeId: string) => {
    return codes?.find((c) => c.$id === codeId);
  };

  const filteredStudents =
    students?.filter((student) => {
      const matchesFilter = filter === "all" || student.status === filter;
      const matchesSearch =
        student.userId.toLowerCase().includes(search.toLowerCase()) ||
        student.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        student.user?.email?.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    }) || [];

  const stats = {
    total: students?.length || 0,
    active: students?.filter((s) => s.status === "active").length || 0,
    expired: students?.filter((s) => s.status === "expired").length || 0,
    revoked: students?.filter((s) => s.status === "revoked").length || 0,
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (isError && !students) {
    return (
      <div className="p-8">
        <Card className="text-center py-12">
          <h1 className="text-xl font-semibold text-white mb-4">Couldn’t load students</h1>
          <Button onClick={() => void refetch()} isLoading={isFetching}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-white/50 mt-1">Manage enrolled students</p>
        </div>
        <Button variant="outline" onClick={() => void refetch()} isLoading={isFetching}>
          Refresh
        </Button>
      </div>

      {isError && (
        <p role="alert" className="mb-4 text-sm text-red-400">
          Couldn’t refresh students. Showing the last loaded list.
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "bg-white/10" },
          { label: "Active", value: stats.active, color: "bg-green-500/20" },
          { label: "Expired", value: stats.expired, color: "bg-red-500/20" },
          { label: "Revoked", value: stats.revoked, color: "bg-gray-500/20" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.color} rounded-xl p-4 text-center`}
          >
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-white/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Search by name, user ID, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-5 h-5" />}
          className="flex-1 max-w-md"
        />
        <div className="flex gap-2">
          {(["all", "active", "expired", "revoked"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No students found
          </h3>
          <p className="text-white/50">
            {students?.length === 0
              ? "Students will appear here when they use your enrollment codes"
              : "No students match your filters"}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Student
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    User ID
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Code
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Enrolled
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Expires
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Status
                  </th>
                  <th className="text-left text-sm font-medium text-white/50 px-6 py-4">
                    Progress
                  </th>
                  <th className="text-right text-sm font-medium text-white/50 px-6 py-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const code = getCodeInfo(student.codeId);
                  return (
                    <tr
                      key={student.$id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-500" />
                          </div>

                          <div>
                            <p className="text-sm font-medium text-white">
                              {student.user?.name || "Unknown Student"}
                            </p>
                            <p className="text-xs text-white/50">
                              {student.user?.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white/70 font-mono">
                          {student.userId.slice(0, 12)}...
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white font-mono">
                          {code?.code || "N/A"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white/70">
                          {formatDate(student.enrolledAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-white/70">
                          {formatDate(student.expiresAt)}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={student.status} />
                      </td>
                      <td className="px-6 py-4 text-sm text-white/70">
                        {student.user?.xp || 0} XP · {student.user?.streak || 0} streak
                      </td>
                      <td className="px-6 py-4 text-right">
                        {student.status === "active" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => extendMutation.mutate({ studentId: student.$id, expectedExpiresAt: student.expiresAt })}
                              disabled={isUpdatingAccess}
                            >
                              Extend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeMutation.mutate({ studentId: student.$id })}
                              disabled={isUpdatingAccess}
                            >
                              <UserX className="w-4 h-4 text-red-400" />
                              Revoke
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Info Banner */}
      <div className="mt-8 p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-accent-500 mt-0.5" />
        <div>
          <p className="text-sm text-white font-medium">
            About Revoking Access
          </p>
          <p className="text-sm text-white/60 mt-1">
            Revoking a student's access will free up a seat on the code,
            allowing another student to enroll. The revoked student will lose
            premium access immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
