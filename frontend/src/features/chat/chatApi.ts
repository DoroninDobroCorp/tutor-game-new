import { apiSlice } from "../../app/api/apiSlice";
type UnreadSummaryResponse = Record<string, number>;

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUnreadSummary: builder.query<UnreadSummaryResponse, void>({
      query: () => ({
        url: "/chat/unread-summary",
        method: "GET",
      }),
      transformResponse: (response: { data: UnreadSummaryResponse }) => {
        return response.data || {};
      },
      providesTags: ["UnreadCount"],
    }),
  }),
});

export const { useGetUnreadSummaryQuery, useLazyGetUnreadSummaryQuery } =
  chatApi;
