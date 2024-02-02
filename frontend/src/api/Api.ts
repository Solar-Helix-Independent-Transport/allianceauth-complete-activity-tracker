import type { paths } from "./CatApi";
import Cookies from "js-cookie";
import createClient from "openapi-fetch";

export const getCatApi = () => {
  const csrf = Cookies.get("csrftoken");

  return createClient<paths>({
    baseUrl: "/",
    headers: { "X-Csrftoken": csrf ? csrf : "" },
  });
};
