import { getCatApi } from "../../api/Api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "react-bootstrap/Button";

const CloseFleetButton = ({ fleet_id }: { fleet_id: number }) => {
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
      className="w-100 mt-2"
    >
      {mutation.isSuccess ? "Stopped Tracking" : mutation.isPending ? "Stopping…" : "Stop Tracking Fleet"}
    </Button>
  );
};

export default CloseFleetButton;
