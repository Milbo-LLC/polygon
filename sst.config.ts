// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "polygon",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const vpc = new sst.aws.Vpc("MyVpc");
    const cluster = new sst.aws.Cluster("MyCluster", { vpc });
    const bucket = new sst.aws.Bucket("MyBucket", { access: "public" });
    
    new sst.aws.Service("MyService", {
      cluster,
      cpu: "0.5 vCPU",
      memory: "1 GB",
      loadBalancer: {
        ports: [{ 
          listen: "80/http",
          forward: "3000/http"
        }]
      },
      logging: {
        retention: "1 week"
      },
      environment: {
        NEXT_PUBLIC_POSTHOG_KEY: "aws:secretsmanager:polygon:NEXT_PUBLIC_POSTHOG_KEY",
        NEXT_PUBLIC_POSTHOG_HOST: "aws:secretsmanager:polygon:NEXT_PUBLIC_POSTHOG_HOST",
        NEXTAUTH_URL: "aws:secretsmanager:polygon:NEXTAUTH_URL",
        DATABASE_URL: "aws:secretsmanager:polygon:DATABASE_URL",
        GOOGLE_CLIENT_SECRET: "aws:secretsmanager:polygon:GOOGLE_CLIENT_SECRET",
        GOOGLE_CLIENT_ID: "aws:secretsmanager:polygon:GOOGLE_CLIENT_ID",
        NEXTAUTH_SECRET: "aws:secretsmanager:polygon:NEXTAUTH_SECRET",
      },
      dev: {
        command: "npm run dev",
      },
      link: [bucket],
    });
  }
});
