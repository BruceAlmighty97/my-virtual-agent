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
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "geoffreyholland.com";
    const telephonySubdomain = `telephony.${domainName}`;
    const agenticSubdomain = `agentic.${domainName}`;
    const secretsName = "MyVirtualAgentSecrets";

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    /* COMMON ASSETS */
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });

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
    const privateLoadBalancer = new elbv2.ApplicationLoadBalancer(
      this,
      "AgenticALB",
      {
        vpc,
        internetFacing: false,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      }
    );

    const privateListener = privateLoadBalancer.addListener("AgenticListener", {
      port: 80,
      open: false,
    });

    const agenticTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "AgenticTaskDef",
      {
        family: "mva-agentic-service-task",
        memoryLimitMiB: 512,
        cpu: 256, 
        executionRole: executionRole,
      }
    );

    const agenticContainer = agenticTaskDefinition.addContainer(
      "AgenticContainer",
      {
        image: ecs.ContainerImage.fromRegistry(
          "456235764148.dkr.ecr.us-east-1.amazonaws.com/mva-agentic:latest"
        ),
        logging: new ecs.AwsLogDriver({
          streamPrefix: "agentic-service",
          logGroup,
        }),
        portMappings: [
          {
            containerPort: 3000, // Corrected placement of containerPort
            protocol: ecs.Protocol.TCP,
          },
        ],
      }
    );

    const agenticService = new ecs.FargateService(this, "AgenticService", {
      cluster,
      taskDefinition: agenticTaskDefinition,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Deploy in private subnets
      },
      assignPublicIp: false, // Ensures it is not exposed publicly
      desiredCount: 2,
    });

    const cfnAgenticService = agenticService.node
      .defaultChild as ecs.CfnService;
    cfnAgenticService.serviceName = "mva-agentic-service";

    privateListener.addTargets("AgenticTargetGroup", {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [agenticService],
      healthCheck: {
        path: "/",
        interval: cdk.Duration.seconds(30),
      },
    });

    new route53.ARecord(this, "AgenticDnsRecord", {
      zone: hostedZone,
      recordName: agenticSubdomain,
      target: route53.RecordTarget.fromAlias(
        new route53_targets.LoadBalancerTarget(privateLoadBalancer)
      ),
    });

    /* OUTPUT */
    new cdk.CfnOutput(this, "ALBDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
  }
}
