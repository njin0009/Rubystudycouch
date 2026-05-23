const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const questionsPath = path.join(root, 'public/assets/js/questions.js');
const progressPath = path.join(__dirname, 'explanations-progress.json');
const outputPath = path.join(root, 'public/assets/js/explanations.js');

function readQuestions() {
  const raw = fs.readFileSync(questionsPath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw.replace(/^var ALL_QUESTIONS=/, '').replace(/;?\s*$/, ''));
}

function normalizeCorrect(correct) {
  return Array.isArray(correct) ? correct : [correct];
}

function compact(text, max = 150) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trim()}...`;
}

function nameOf(optionText) {
  return String(optionText)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^AWS /, 'AWS ')
    .trim();
}

const serviceFacts = [
  [/Elastic Beanstalk/i, 'Elastic Beanstalk lets developers deploy web applications while AWS handles provisioning, load balancing, scaling, and monitoring.'],
  [/QuickSight/i, 'QuickSight is AWS managed business intelligence for dashboards, visualizations, and ML-powered insights.'],
  [/Intelligent-Tiering/i, 'S3 Intelligent-Tiering automatically moves objects between access tiers when access patterns vary.'],
  [/Glacier Flexible Retrieval/i, 'S3 Glacier Flexible Retrieval is designed for low-cost archive storage with occasional retrieval.'],
  [/Artifact/i, 'AWS Artifact provides on-demand AWS compliance reports, certifications, agreements, and attestations.'],
  [/Outposts/i, 'AWS Outposts runs AWS-managed infrastructure on premises for local data residency and low-latency access.'],
  [/Amazon Connect/i, 'Amazon Connect is a cloud contact center service with built-in AI and omnichannel capabilities.'],
  [/IAM Identity Center|Single Sign-On/i, 'IAM Identity Center centrally manages workforce identities and single sign-on across AWS accounts and applications.'],
  [/CloudTrail/i, 'CloudTrail records AWS account API activity for auditing who did what, when, and from where.'],
  [/CloudWatch/i, 'CloudWatch collects metrics, logs, events, alarms, and dashboards for monitoring AWS resources and applications.'],
  [/GuardDuty/i, 'GuardDuty is a managed threat detection service that analyzes logs for malicious or anomalous activity.'],
  [/Inspector/i, 'Amazon Inspector scans workloads for software vulnerabilities and unintended network exposure.'],
  [/Macie/i, 'Amazon Macie discovers and classifies sensitive data stored in Amazon S3.'],
  [/Trusted Advisor/i, 'Trusted Advisor checks AWS environments against best practices for cost, security, reliability, performance, and service limits.'],
  [/Organizations/i, 'AWS Organizations centrally manages multiple AWS accounts, consolidated billing, and service control policies.'],
  [/Control Tower/i, 'AWS Control Tower sets up and governs a multi-account AWS environment with guardrails.'],
  [/Cost Explorer/i, 'Cost Explorer analyzes AWS cost and usage trends and can provide rightsizing insights.'],
  [/AWS Budgets/i, 'AWS Budgets tracks cost or usage against thresholds and sends alerts.'],
  [/Pricing Calculator/i, 'AWS Pricing Calculator estimates expected AWS costs before resources are deployed.'],
  [/Compute Optimizer/i, 'Compute Optimizer analyzes utilization metrics and recommends better-sized compute resources.'],
  [/Savings Plan/i, 'Savings Plans provide discounted compute pricing in exchange for a 1-year or 3-year spend commitment.'],
  [/Reserved Instance|Reserved Instances/i, 'Reserved Instances provide discounts for steady usage in exchange for a 1-year or 3-year commitment.'],
  [/Spot Instance|Spot Instances/i, 'Spot Instances offer deep discounts for interruptible, fault-tolerant workloads.'],
  [/On-Demand/i, 'On-Demand pricing is best when usage is short-term, unpredictable, or requires no long-term commitment.'],
  [/CloudFormation/i, 'CloudFormation provisions AWS resources from templates as infrastructure as code.'],
  [/AWS CDK|Cloud Development Kit/i, 'AWS CDK defines cloud infrastructure in familiar programming languages and synthesizes CloudFormation templates.'],
  [/CodeDeploy/i, 'CodeDeploy automates application deployments to EC2, on-premises servers, Lambda, and ECS.'],
  [/CodeBuild/i, 'CodeBuild is a managed build and test service for CI/CD pipelines.'],
  [/Lambda/i, 'Lambda runs code without provisioning servers and scales automatically per invocation.'],
  [/Fargate/i, 'Fargate runs containers without requiring customers to manage EC2 instances.'],
  [/ECS/i, 'Amazon ECS is a managed container orchestration service.'],
  [/App Runner/i, 'App Runner builds and runs containerized web applications and APIs with minimal infrastructure management.'],
  [/EC2/i, 'Amazon EC2 provides resizable virtual servers in the AWS Cloud.'],
  [/Auto Scaling/i, 'Auto Scaling adjusts capacity automatically to maintain performance and cost efficiency.'],
  [/Application Load Balancer|ELB/i, 'Elastic Load Balancing distributes incoming traffic across healthy compute resources; ALB is for HTTP and HTTPS.'],
  [/Direct Connect/i, 'Direct Connect provides a dedicated private network connection from on premises to AWS.'],
  [/Site-to-Site VPN/i, 'AWS Site-to-Site VPN creates encrypted tunnels between on-premises networks and AWS over the internet.'],
  [/Transit Gateway/i, 'Transit Gateway acts as a central hub for connecting VPCs and on-premises networks.'],
  [/PrivateLink/i, 'AWS PrivateLink provides private connectivity to services without exposing traffic to the public internet.'],
  [/VPC endpoint/i, 'VPC endpoints privately connect a VPC to supported AWS services without using the public internet.'],
  [/Internet gateway/i, 'An internet gateway enables internet connectivity for resources in public subnets.'],
  [/network ACL|Network access control/i, 'Network ACLs are stateless subnet-level traffic filters.'],
  [/Security group/i, 'Security groups are stateful instance-level virtual firewalls.'],
  [/CloudFront/i, 'CloudFront is a global content delivery network that caches content at edge locations.'],
  [/Global Accelerator/i, 'Global Accelerator improves global application availability and performance by routing traffic through AWS edge locations and the AWS network.'],
  [/Route 53/i, 'Route 53 is AWS scalable DNS and domain routing service.'],
  [/S3\b|Amazon S3/i, 'Amazon S3 is durable, scalable object storage for files, static websites, backups, and data lakes.'],
  [/S3 Standard-IA/i, 'S3 Standard-IA is for infrequently accessed data that still needs rapid access and multi-AZ resilience.'],
  [/S3 Express One Zone/i, 'S3 Express One Zone is optimized for very high-performance, single-AZ object access.'],
  [/EBS snapshot/i, 'EBS snapshots back up EBS volumes and can be used to restore data.'],
  [/EFS/i, 'Amazon EFS is elastic shared file storage for Linux workloads.'],
  [/Storage Gateway/i, 'Storage Gateway connects on-premises environments to AWS cloud storage through local gateways.'],
  [/Snowball Edge/i, 'Snowball Edge transfers large amounts of data offline using rugged physical devices.'],
  [/DataSync/i, 'DataSync automates and accelerates online data transfer between on-premises storage and AWS storage services.'],
  [/AWS Backup/i, 'AWS Backup centralizes and automates backup policies across supported AWS services.'],
  [/RDS/i, 'Amazon RDS is a managed relational database service with automated administration tasks such as backups and patching.'],
  [/Aurora/i, 'Amazon Aurora is a fully managed MySQL- and PostgreSQL-compatible relational database engine.'],
  [/DynamoDB/i, 'DynamoDB is a fully managed serverless NoSQL key-value and document database.'],
  [/Redshift/i, 'Amazon Redshift is a managed cloud data warehouse for analytics.'],
  [/Athena/i, 'Athena runs serverless SQL queries directly against data in Amazon S3.'],
  [/DMS|Database Migration Service/i, 'AWS DMS migrates databases to AWS with minimal downtime.'],
  [/Schema Conversion Tool/i, 'AWS SCT helps convert database schemas and code during heterogeneous database migrations.'],
  [/Migration Hub/i, 'Migration Hub provides a central place to track application migration progress.'],
  [/Application Migration Service/i, 'Application Migration Service lifts and shifts servers to AWS with minimal downtime.'],
  [/Application Discovery Service/i, 'Application Discovery Service collects on-premises server and dependency data for migration planning.'],
  [/Migration Evaluator/i, 'Migration Evaluator builds data-driven business cases for AWS migration.'],
  [/Kendra/i, 'Amazon Kendra is an ML-powered enterprise search service.'],
  [/Lex/i, 'Amazon Lex builds conversational chatbots using voice and text.'],
  [/Polly/i, 'Amazon Polly converts text into lifelike speech.'],
  [/Transcribe/i, 'Amazon Transcribe converts speech to text.'],
  [/Rekognition/i, 'Amazon Rekognition analyzes images and video.'],
  [/SageMaker/i, 'Amazon SageMaker is a managed service for building, training, and deploying machine learning models.'],
  [/Cognito/i, 'Amazon Cognito provides user sign-up, sign-in, and access control for applications.'],
  [/Secrets Manager/i, 'Secrets Manager stores, encrypts, retrieves, and rotates secrets such as passwords and API keys.'],
  [/KMS|Key Management Service/i, 'AWS KMS creates and manages cryptographic keys used to encrypt AWS data.'],
  [/WAF/i, 'AWS WAF filters web requests to help protect applications from common web exploits.'],
  [/Shield Advanced|Shield/i, 'AWS Shield helps protect applications against DDoS attacks, with Advanced adding enhanced protections and support.'],
  [/IAM\b|Identity and Access Management/i, 'IAM manages identities, permissions, and least-privilege access to AWS resources.'],
  [/STS|Simple Token Service/i, 'AWS STS issues temporary security credentials for trusted users and roles.'],
  [/Access key/i, 'Access keys are credentials for programmatic AWS access through the CLI, SDKs, or APIs.'],
  [/CLI|Command Line Interface/i, 'The AWS CLI manages AWS services from scripts and terminals.'],
  [/Management Console/i, 'The AWS Management Console is the browser-based interface for managing AWS services.'],
  [/Marketplace/i, 'AWS Marketplace is a catalog for finding and deploying third-party software on AWS.'],
  [/Business Support/i, 'AWS Business Support provides 24/7 technical support and full Trusted Advisor checks for production workloads.'],
  [/Professional Services/i, 'AWS Professional Services helps customers plan and execute cloud adoption and migration using AWS best practices.'],
  [/Health Dashboard/i, 'AWS Health Dashboard shows AWS service events and account-specific health information.'],
  [/Developer Forums/i, 'AWS Developer Forums are community discussion forums for AWS users and developers.'],
  [/Regions/i, 'AWS Regions are separate geographic areas for deploying AWS services.'],
  [/Availability Zones/i, 'Availability Zones are isolated locations within a Region for high availability.'],
  [/Workspaces/i, 'Amazon WorkSpaces is a managed virtual desktop service.'],
];

function factFor(text) {
  const found = serviceFacts.find(([pattern]) => pattern.test(text));
  return found ? found[1] : null;
}

function buildExplanation(q) {
  const correctLetters = normalizeCorrect(q.correct);
  const correct = correctLetters.map((letter) => `${letter}: ${q.options[letter]}`);
  const wrong = Object.entries(q.options)
    .filter(([letter]) => !correctLetters.includes(letter))
    .map(([letter, text]) => `${letter}: ${nameOf(text)}`);
  const facts = correctLetters
    .map((letter) => factFor(q.options[letter]) || `${q.options[letter]} directly matches the requirement in this question.`)
    .filter((value, index, arr) => arr.indexOf(value) === index);

  const answerLabel = correctLetters.length > 1 ? 'answers are' : 'answer is';
  const wrongLabel = wrong.length ? ` The other options (${wrong.join('; ')}) do not match the stated requirement as directly.` : '';
  return `The correct ${answerLabel} ${correct.join('; ')}. ${facts.join(' ')} This matches the question requirement: ${compact(q.question)}${wrongLabel}`;
}

function answerPrefix(q) {
  return `Correct answer: ${normalizeCorrect(q.correct).map((letter) => `${letter}: ${q.options[letter]}`).join('; ')}.`;
}

function ensureAnswerPrefix(q, explanation) {
  const prefix = answerPrefix(q);
  if (explanation.includes(prefix)) return explanation;
  return `${prefix} ${explanation}`;
}

function validate(questions, explanations) {
  const errors = [];
  for (const q of questions) {
    const id = String(q.id);
    const text = explanations[id];
    if (!text) {
      errors.push(`${id}: missing explanation`);
      continue;
    }
    for (const letter of normalizeCorrect(q.correct)) {
      const option = q.options[letter];
      if (!text.includes(`${letter}:`) || !text.includes(option)) {
        errors.push(`${id}: explanation does not include correct option ${letter}: ${option}`);
      }
    }
  }
  return errors;
}

const questions = readQuestions();
const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

let filled = 0;
for (const q of questions) {
  const id = String(q.id);
  if (!progress[id]) {
    progress[id] = buildExplanation(q);
    filled += 1;
  }
  progress[id] = ensureAnswerPrefix(q, progress[id]);
}

const errors = validate(questions, progress);
if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'));
  console.error(`Validation failed with ${errors.length} error(s).`);
  process.exit(1);
}

fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

const lines = Object.entries(progress)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([id, text]) => `  ${JSON.stringify(id)}: ${JSON.stringify(text)}`);

fs.writeFileSync(
  outputPath,
  `// Auto-generated CLF-C02 answer explanations.\nwindow.EXPLANATIONS = {\n${lines.join(',\n')}\n};\n`,
  'utf8',
);

console.log(`Filled ${filled} missing explanation(s).`);
console.log(`Validated ${questions.length} explanation(s).`);
console.log(`Wrote ${Object.keys(progress).length} explanation(s) to ${outputPath}.`);
