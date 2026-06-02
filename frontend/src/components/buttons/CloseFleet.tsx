import { getCatApi } from "../../api/Api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";

const CloseFleetButton = ({ fleet_id, size, className }: { fleet_id: number; size?: "sm" | "lg"; className?: string }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { POST } = getCatApi();
      const { data, error } = await POST("/cat/api/fleets/{fleet_id}/end", {
        params: { path: { fleet_id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getActiveFleetList"] });
    },
  });

  return (
    <Button
      variant={mutation.isError ? "danger" : "warning"}
      disabled={mutation.isPending || mutation.isSuccess}
      onClick={() => mutation.mutate()}
      size={size}
      className={className}
    >
      {mutation.isSuccess ? "Stopped Tracking" : mutation.isPending ? "Stopping…" : "Stop Tracking Fleet"}
    </Button>
  );
};

export default CloseFleetButton;
