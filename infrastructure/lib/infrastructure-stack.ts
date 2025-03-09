import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Vpc, SecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';
import { CfnSubnetGroup, CfnCacheCluster } from 'aws-cdk-lib/aws-elasticache';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "geoffreyholland.com";
    const telephonySubdomain = `telephony.${domainName}`;
    const agenticSubdomain = `agentic.${domainName}`;
    const secretsName = "MyVirtualAgentSecrets";
    let redisUrl: string;

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    /* COMMON ASSETS */
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });

    redisUrl = this.createRedisInstance(vpc);

    const cluster = new ecs.Cluster(this, "MyVirtualAgentCluster", {
      vpc,
      clusterName: "mva-cluster",
    });

    const executionRole = new iam.Role(this, "EcsTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );

    executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const taskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:ListBucket"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const logGroup = new logs.LogGroup(this, "TelephonyLogGroup", {
      logGroupName: "/ecs/my-virtual-agent",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
    });

    const myVirtualAgentSecrets = secretsmanager.Secret.fromSecretNameV2(
      this,
      secretsName,
      secretsName
    );

    /* TELEPHONY SERVICE ASSETS */
    const certificate = new certificatemanager.Certificate(
      this,
      "Certificate",
      {
        domainName: telephonySubdomain,
        validation:
          certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "TelephonyService",
        {
          cluster,
          memoryLimitMiB: 512,
          cpu: 256,
          desiredCount: 2,
          taskImageOptions: {
            image: ecs.ContainerImage.fromRegistry(
              "456235764148.dkr.ecr.us-east-1.amazonaws.com/mva-telephony:latest"
            ),
            containerPort: 3000,
            executionRole: executionRole,
            environment: {
              AGENTIC_BASE_URL: "https://agentic.geoffreyholland.com",
            },
            secrets: {
              DEEPGRAM_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "DEEPGRAM_API_KEY"
              ),
              ELEVENLABS_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "ELEVENLABS_API_KEY"
              ),
              ELEVENLABS_VOICE_ID: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "ELEVENLABS_VOICE_ID"
              ),
              MY_VIRTUAL_AGENT_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "MY_VIRTUAL_AGENT_API_KEY"
              ),
            },
            logDriver: new ecs.AwsLogDriver({
              streamPrefix: "telephony-service",
              logGroup,
            }),
          },
          certificate,
          domainName: telephonySubdomain,
          domainZone: hostedZone,
        }
      );

    const cfnService = fargateService.service.node
      .defaultChild as ecs.CfnService;
    cfnService.serviceName = "mva-telephony-service";

    /* AGENTIC ASSETS */

    const agenticCertificate = new certificatemanager.Certificate(
      this,
      "AgenticCertificate",
      {
        domainName: agenticSubdomain,
        validation:
          certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const agenticFargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "AgenticService",
        {
          cluster,
          memoryLimitMiB: 1024,
          cpu: 512,
          desiredCount: 1,
          taskImageOptions: {
            image: ecs.ContainerImage.fromRegistry(
              "456235764148.dkr.ecr.us-east-1.amazonaws.com/mva-agentic:latest"
            ),
            containerPort: 3000,
            executionRole: executionRole,
            taskRole: taskRole,
            environment: {
              LANGSMITH_TRACING: "true",
              LANGSMITH_ENDPOINT: "https://api.smith.langchain.com",
              LANGSMITH_PROJECT: "my-virtual-agent",
              REDIS_URL: redisUrl
            },
            secrets: {
              LANGSMITH_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "LANGSMITH_API_KEY"
              ),
              GROQ_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "GROQ_API_KEY"
              ),
              TAVILY_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "TAVILY_API_KEY"
              ),
              OPENAI_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "OPENAI_API_KEY"
              ),
              MY_VIRTUAL_AGENT_API_KEY: ecs.Secret.fromSecretsManager(
                myVirtualAgentSecrets,
                "MY_VIRTUAL_AGENT_API_KEY"
              ),
            },
            logDriver: new ecs.AwsLogDriver({
              streamPrefix: "agentic-service",
              logGroup,
            }),
          },
          certificate: agenticCertificate,
          domainName: agenticSubdomain,
          domainZone: hostedZone,
        }
      );

    const agenticCfnService = agenticFargateService.service.node
      .defaultChild as ecs.CfnService;
    agenticCfnService.serviceName = "mva-agentic-service";

    this.createDocumentStorageAndUpdate();

    /* OUTPUT */
    new cdk.CfnOutput(this, "ALBDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
  }

  private createDocumentStorageAndUpdate() {
    const bucketName = "gbh-virtual-agent-documents";
    const bucket = new s3.Bucket(this, "DocumentStorageBucket", {
      bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });
  }

  private createRedisInstance(vpc: Vpc): string {
    // Security Group for Redis
    const redisSecurityGroup = new SecurityGroup(this, "RedisSecurityGroup", {
      vpc,
      description: "Allow Redis access",
      allowAllOutbound: true,
    });
    redisSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(6379),
      "Allow Redis access"
    );

    // Create a subnet group for Redis
    const subnetGroup = new CfnSubnetGroup(this, "RedisSubnetGroup", {
      description: "Subnet group for Redis cluster",
      subnetIds: vpc.privateSubnets.map((subnet) => subnet.subnetId),
    });

    // Create the Redis cluster
    const redisCluster = new CfnCacheCluster(this, "RedisCluster", {
      cacheNodeType: "cache.t3.micro", // Change as needed
      engine: "redis",
      numCacheNodes: 1, // Single-node Redis instance
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
    });

    const redisUrl = `redis://${redisCluster.attrRedisEndpointAddress}`;
    return redisUrl
  }
}
