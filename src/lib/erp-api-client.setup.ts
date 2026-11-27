import { configureErpApiClient } from "@repo/erp-api-client";
import { isPathInRecoveryWhiteList } from "@repo/recovery";
import { getToken } from "@/lib/utils/token.helper";

configureErpApiClient({
    getToken,
    isPathInRecoveryWhiteList,
    useCookieProxy: false,
});
