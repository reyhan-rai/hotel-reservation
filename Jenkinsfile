// Jenkinsfile — orchestrates the whole pipeline.
//
// Jenkins itself does the orchestration and decision-making; the actual
// build/test/Dockerise step is delegated to AWS CodeBuild (using
// buildspec.yml), and the app is deployed to AWS Elastic Beanstalk.
//
// Flow: CodeCommit push -> Jenkins job triggers -> AWS CodeBuild
//       (npm test, docker build, push to ECR) -> Jenkins deploys the
//       resulting artifact to Elastic Beanstalk (rolling, zero-downtime)
//       -> Jenkins polls environment health -> rolls back automatically
//       on failure.
//
// Jenkins job setup notes (Manage Jenkins > this job > Configure):
//   - Source Code Management: Git, repository URL = the CodeCommit
//     HTTPS/SSH URL, credentials = an IAM user's "git credentials for
//     CodeCommit" or an SSH key.
//   - Build Triggers: "Poll SCM" (e.g. every 2 minutes: H/2 * * * *) or,
//     better, an SNS notification from a CodeCommit trigger hitting a
//     Jenkins webhook.
//   - Requires the AWS CLI configured on the Jenkins agent (either an
//     instance profile if Jenkins runs on EC2, or credentials injected
//     via the Jenkins "AWS Credentials" plugin).

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    AWS_REGION        = 'eu-west-2'
    AWS_ACCOUNT_ID    = credentials('aws-account-id')      // Jenkins "Secret text" credential
    CODEBUILD_PROJECT = 'aurelia-hotel-build'
    EB_APPLICATION    = 'aurelia-hotel'
    EB_ENVIRONMENT    = 'aurelia-hotel-env'
    S3_ARTIFACT_BUCKET = 'aurelia-eb-artifacts'
  }

  stages {

    stage('Checkout') {
      steps {
        // Pulls from AWS CodeCommit — configured in the Jenkins job's
        // own "Source Code Management" section, not here.
        checkout scm
      }
    }

    stage('Trigger AWS CodeBuild (test + Dockerise + push to ECR)') {
      steps {
        script {
          def buildId = sh(
            script: "aws codebuild start-build --project-name ${CODEBUILD_PROJECT} --region ${AWS_REGION} --query 'build.id' --output text",
            returnStdout: true
          ).trim()
          echo "Started CodeBuild build: ${buildId}"

          def status = 'IN_PROGRESS'
          while (status == 'IN_PROGRESS') {
            sleep(time: 15, unit: 'SECONDS')
            status = sh(
              script: "aws codebuild batch-get-builds --ids ${buildId} --region ${AWS_REGION} --query 'builds[0].buildStatus' --output text",
              returnStdout: true
            ).trim()
            echo "CodeBuild status: ${status}"
          }

          if (status != 'SUCCEEDED') {
            error("CodeBuild reported '${status}' (this includes a failed 'npm test') — stopping before any deployment.")
          }
        }
      }
    }

    stage('Record current live version (rollback target)') {
      steps {
        script {
          env.PREVIOUS_VERSION = sh(
            script: "aws elasticbeanstalk describe-environments --environment-names ${EB_ENVIRONMENT} --region ${AWS_REGION} --query 'Environments[0].VersionLabel' --output text",
            returnStdout: true
          ).trim()
          echo "Current live version (used for rollback if this deploy fails): ${env.PREVIOUS_VERSION}"
        }
      }
    }

    stage('Deploy to Elastic Beanstalk (rolling, zero downtime)') {
      steps {
        script {
          env.NEW_VERSION = "build-${env.BUILD_NUMBER}"
          sh """
            aws elasticbeanstalk create-application-version \
              --application-name ${EB_APPLICATION} \
              --version-label ${env.NEW_VERSION} \
              --source-bundle S3Bucket=${S3_ARTIFACT_BUCKET},S3Key=${env.NEW_VERSION}.zip \
              --region ${AWS_REGION}

            aws elasticbeanstalk update-environment \
              --environment-name ${EB_ENVIRONMENT} \
              --version-label ${env.NEW_VERSION} \
              --region ${AWS_REGION}
          """
        }
      }
    }

    stage('Wait for environment health') {
      steps {
        sh "bash scripts/wait-for-healthy.sh ${EB_ENVIRONMENT} ${AWS_REGION} 20"
      }
    }
  }

  post {
    failure {
      script {
        if (env.PREVIOUS_VERSION) {
          echo "Deployment failed health checks — rolling back to ${env.PREVIOUS_VERSION}"
          sh "bash scripts/rollback.sh ${EB_ENVIRONMENT} ${env.PREVIOUS_VERSION} ${AWS_REGION}"
        } else {
          echo "No previous version was recorded — manual rollback required."
        }
      }
    }
    success {
      echo "Deployed ${env.NEW_VERSION} successfully — environment is healthy."
    }
    always {
      cleanWs()
    }
  }
}
