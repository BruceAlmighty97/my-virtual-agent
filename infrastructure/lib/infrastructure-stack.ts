import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';


export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "geoffreyholland.com";
    const telephonySubdomain = `telephony.${domainName}`;
    const secretsName = 'MyVirtualAgentSecrets';

    const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
      domainName,
    });

    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2 });

    const cluster = new ecs.Cluster(this, "MyVirtualAgentCluster", { 
      vpc,
      clusterName: "mva-cluster"
    });

    const certificate = new certificatemanager.Certificate(
      this,
      "Certificate",
      {
        domainName: telephonySubdomain,
        validation:
          certificatemanager.CertificateValidation.fromDns(hostedZone),
      }
    );

    const executionRole = new iam.Role(this, "EcsTaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    // Attach AmazonECSTaskExecutionRolePolicy to the role
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy"
      )
    );

    // Explicitly allow ecr:GetAuthorizationToken (in case it's not covered)
    executionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
        effect: iam.Effect.ALLOW,
      })
    );

    const myVirtualAgentSecrets = secretsmanager.Secret.fromSecretNameV2(this, secretsName, secretsName);

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
              DEEPGRAM_API_KEY : ecs.Secret.fromSecretsManager(myVirtualAgentSecrets, 'DEEPGRAM_API_KEY'),
              ELEVENLABS_API_KEY : ecs.Secret.fromSecretsManager(myVirtualAgentSecrets, 'ELEVENLABS_API_KEY'),
              ELEVENLABS_VOICE_ID : ecs.Secret.fromSecretsManager(myVirtualAgentSecrets, 'ELEVENLABS_VOICE_ID'),
            }
          },
          certificate,
          domainName: telephonySubdomain,
          domainZone: hostedZone,
        }
      );
    // Override the ECS Service Name
    const cfnService = fargateService.service.node.defaultChild as ecs.CfnService;
    cfnService.serviceName = "mva-telephony-service";

    new cdk.CfnOutput(this, "ALBDNS", {
      value: fargateService.loadBalancer.loadBalancerDnsName,
    });
  }
}
