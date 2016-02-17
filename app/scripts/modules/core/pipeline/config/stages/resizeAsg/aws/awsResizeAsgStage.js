'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.core.pipeline.stage.aws.resizeAsgStage', [
  require('../../../../../application/modal/platformHealthOverride.directive.js'),
  require('./resizeAsgExecutionDetails.controller.js'),
])
  .config(function(pipelineConfigProvider) {
    pipelineConfigProvider.registerStage({
      provides: 'resizeServerGroup',
      alias: 'resizeAsg',
      cloudProvider: 'aws',
      templateUrl: require('./resizeAsgStage.html'),
      executionDetailsUrl: require('./resizeAsgExecutionDetails.html'),
      executionStepLabelUrl: require('./resizeAsgStepLabel.html'),
      validators: [
        {
          type: 'targetImpedance',
          message: 'This pipeline will attempt to resize a server group without deploying a new version into the same cluster.'
        },
        { type: 'requiredField', fieldName: 'target', },
        { type: 'requiredField', fieldName: 'action', },
        { type: 'requiredField', fieldName: 'regions', },
        { type: 'requiredField', fieldName: 'cluster' },
        { type: 'requiredField', fieldName: 'credentials', fieldLabel: 'account'},
      ],
    });
  }).controller('awsResizeAsgStageCtrl', function($scope, accountService, stageConstants) {

    var ctrl = this;

    let stage = $scope.stage;

    $scope.viewState = {
      accountsLoaded: false,
      regionsLoaded: false,
    };

    accountService.listAccounts('aws').then(function (accounts) {
      $scope.accounts = accounts;
      $scope.viewState.accountsLoaded = true;
    });

    $scope.resizeTargets = stageConstants.targetList;

    $scope.scaleActions = [
      {
        label: 'Scale Up',
        val: 'scale_up',
      },
      {
        label: 'Scale Down',
        val: 'scale_down'
      },
      {
        label: 'Scale to Cluster Size',
        val: 'scale_to_cluster'
      },
      {
        label: 'Scale to Exact Size',
        val: 'scale_exact'
      },
    ];

    $scope.resizeTypes = [
      {
        label: 'Percentage',
        val: 'pct'
      },
      {
        label: 'Incremental',
        val: 'incr'
      },
    ];

    stage.capacity = stage.capacity || {};
    stage.regions = stage.regions || [];
    stage.target = stage.target || $scope.resizeTargets[0].val;
    stage.action = stage.action || $scope.scaleActions[0].val;
    stage.resizeType = stage.resizeType || $scope.resizeTypes[0].val;
    if (stage.resizeType === 'exact') {
      stage.action = 'scale_exact';
    }
    stage.cloudProvider = 'aws';

    if (stage.isNew && $scope.application.attributes.platformHealthOnly) {
      stage.interestingHealthProviderNames = ['Amazon'];
    }

    if (!stage.credentials && $scope.application.defaultCredentials.aws) {
      stage.credentials = $scope.application.defaultCredentials.aws;
    }
    if (!stage.regions.length && $scope.application.defaultRegions.aws) {
      stage.regions.push($scope.application.defaultRegions.aws);
    }

    ctrl.updateResizeType = function() {
      if (stage.action === 'scale_exact') {
        stage.resizeType = 'exact';
        delete stage.scalePct;
        delete stage.scaleNum;
      } else {
        stage.capacity = {};
        if (stage.resizeType === 'pct') {
          delete stage.scaleNum;
        } else if (stage.resizeType === 'incr') {
          delete stage.scalePct;
        }
      }
    };

  });

