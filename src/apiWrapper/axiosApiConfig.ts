import Axios, { AxiosInstance, AxiosRequestHeaders } from "axios";
// import { handleServiceError } from "./ApiServiceErrors";
import rateLimit from "axios-rate-limit";

export interface IApiClient {
  get<TResponse>(path: string): Promise<TResponse>;
  getById<TResponse>(
    path: string,
    id: string,
    subresource?: string
  ): Promise<TResponse>;
}

interface ApiConfiguration {
  baseURL: string | undefined;
  headers: AxiosRequestHeaders;
}

const apiConfiguration: ApiConfiguration = {
  baseURL: process.env.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Auth-Token": process.env.API_TOKEN || "",
  },
};

export default class ApiClient {
  private client: AxiosInstance;

  protected createAxiosClient(
    apiConfiguration: ApiConfiguration
  ): AxiosInstance {
    return rateLimit(
      Axios.create({
        baseURL: process.env.API_BASE_URL,
        headers: apiConfiguration.headers,
        timeout: 10000,
      }),
      { maxRequests: 10, perMilliseconds: 60000 }
    );
  }

  constructor() {
    this.client = this.createAxiosClient(apiConfiguration);
    console.info("Axios instance created");
  }

  async get<TResponse>(path: string): Promise<TResponse> {
    try {
      const response = await this.client.get<TResponse>(path);
      return response.data;
    } catch (error) {
      //   handleServiceError(error);
      throw error;
    }
  }

  async getbyId<TResponse>(
    path: string,
    id: string,
    subresource?: string
  ): Promise<TResponse> {
    try {
      const response = await this.client.get<TResponse>(
        `${path}/${id}${subresource ? subresource : ""}`
      );
      return response.data;
    } catch (error) {
      //   handleServiceError(error);
      throw error;
    }
  }
}
