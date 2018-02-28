'use strict';
/**
 * @ngdoc function
 * @name bitbloqApp.controller:hardwareTabCtrl
 * @description
 * # hardwareTabCtrl
 * Controller of the components list
 */
angular.module('bitbloqApp')
    .controller('hardwareTabCtrl', hardwareTabCtrl);

function hardwareTabCtrl($rootScope, $scope, $document, $log, hw2Bloqs, alertsService, _, utils, $translate, $window, $timeout, bloqsUtils, hardwareService, userApi, projectService) {

    var container = utils.getDOMElement('.protocanvas'),
        $componentContextMenu = $('#component-context-menu'),
        $boardContextMenu = $('#board-context-menu'),
        $robotContextMenu = $('#robot-context-menu'),
        $bTComponentContextMenu = $('#btcomponent-context-menu'),
        currentProjectService = $scope.currentProjectService || projectService;

    $scope.selectedToolbox = '';
    $scope.currentProject = $scope.currentProject || projectService.project;
    $scope.isEmptyComponentArray = currentProjectService.isEmptyComponentArray;

    $scope.changeToolbox = function(tab, event) {
        if (tab !== '') {
            $scope.$emit('menu--open');
        }
        if (event) {
            if (_.isEqual(event.target.classList, event.currentTarget.classList)) {
                $scope.selectedToolbox = tab;
            }
        } else {
            $scope.selectedToolbox = tab;
        }
    };

    $scope.closeComponentInteraction = function(pins, connectedPin) {
        if (!pins || !pins[Object.keys(connectedPin)[0]]) { //if !autoConnected
            $scope.firstComponent = false;
            if ($scope.common.user) {
                $scope.common.user.hasFirstComponent = true;
                userApi.update({
                    hasFirstComponent: true
                });
            }
            utils.apply($scope);
        }
    };

    $scope.langToBadge = {
        'ca-ES': 'ca',
        'de-De': 'de',
        'en-GB': 'en',
        'es-ES': 'es',
        'eu-ES': 'eu',
        'fr-FR': 'fr',
        'gl': 'gl',
        'it-IT': 'it',
        'pt-PT': 'pt'
    };
    $scope.translate = $translate;

    $scope.closeBluetoothInteraction = function(pins, connectedPin) {
        if (!pins || !pins[Object.keys(connectedPin)[0]]) { //if !autoConnected
            $scope.isMobileConnected = false;
            if ($scope.common.user) {
                $scope.common.user.isMobileConnected = true;
                userApi.update({
                    isMobileConnected: true
                });
            }
            if (!$scope.$$phase) {
                $scope.$apply();
            }
        }
    };

    function _removeIntegratedComponents() {
        if ($scope.boardsMap[$scope.currentProject.hardware.board] && $scope.boardsMap[$scope.currentProject.hardware.board].integratedComponents) {
            var boardIntegratedComponentsList = $scope.boardsMap[$scope.currentProject.hardware.board].integratedComponents,
                j,
                found,
                finalComponentsList = [];
            for (var i = 0; i < $scope.currentProject.hardware.components.length; i++) {

                found = false;
                j = 0;
                while (!found && (j < boardIntegratedComponentsList.length)) {
                    if ($scope.currentProject.hardware.components[i].uid === boardIntegratedComponentsList[j].uid) {
                        found = true;
                    }
                    j++;
                }
                if (!found) {
                    finalComponentsList.push($scope.currentProject.hardware.components[i]);
                } else {
                    currentProjectService.removeComponentInComponentsArray($scope.currentProject.hardware.components[i].category, $scope.currentProject.hardware.components[i].name);
                }
            }
            $scope.currentProject.hardware.components = finalComponentsList;
        }
    }

    $scope.deleteBoard = function() {
        if ($scope.currentProject.hardware.board) {
            hw2Bloqs.removeBoard();
            $scope.currentProject.hardware.showRobotImage = null;
            _removeIntegratedComponents();
            $scope.closeBluetoothInteraction();
            currentProjectService.showActivation = false;
            $scope.currentProjectService.closeActivation = false;
            $scope.boardSelected = false;
            $scope.currentProject.hardware.board = null;
            currentProjectService.startAutosave();
        }
    };

    $scope.deleteRobot = function() {
        $scope.currentProject.hardware.showRobotImage = null;
        $scope.currentProject.hardware.robot = null;

        $scope.deleteBoard();

        $scope.currentProject.hardware.board = null;
        $scope.robotSelected = false;
        currentProjectService.startAutosave();
    };

    $scope.detectElement = function(ev) {
        $scope.changeToolbox('');
        //If component, check it out if component has been moved
        if (ev.target.classList.contains('component')) {
            var componentDOM = ev.target;
            var componentReference = currentProjectService.findComponentInComponentsArray(componentDOM.dataset.uid);

            var newCoordinates = {
                x: (componentDOM.offsetLeft / container.offsetWidth) * 100,
                y: (componentDOM.offsetTop / container.offsetHeight) * 100
            };
            if (!_.isEqual(newCoordinates, componentReference.coordinates) && componentReference.connected) {
                componentReference.coordinates = newCoordinates;
                currentProjectService.startAutosave();
            }
        } else if ($(ev.target).closest('.jsplumb-connector', container).length || $(ev.target)
            .closest('.board_ep', container).length || $(ev.target).closest('.component_ep', container).length) {
            $scope.componentSelected = null;
            $('.component').removeClass('component-selected');
        } else if (ev.target.classList.contains('robot')) {
            $scope.robotSelected = true;
        } else if (ev.target.classList.contains('board') || $(ev.target).closest('.board').length) {
            $scope.boardSelected = true;
            //Unselect selected components
            $scope.componentSelected = null;
            $('.component').removeClass('component-selected');
            hw2Bloqs.unselectAllConnections();

            if ($scope.currentProject.hardware.board) {
                $scope.changeToolbox('components');
            } else {
                $scope.changeToolbox('boards');
            }
        } else if (ev.target.classList.contains('component__container')) {
            if (!$scope.currentProject.hardware.robot) {
                if (!$scope.currentProject.hardware.board) {
                    $scope.changeToolbox('boards');
                } else if ($scope.currentProject.hardware.board && currentProjectService.isEmptyComponentArray()) {
                    $scope.changeToolbox('components');
                }
            }
        } else if ($(ev.target).closest('.baudrate__dropdown').length) {
            ev.preventDefault();
        } else if (ev.target.classList.contains('bitbloqconnect-icon')) {
            hw2Bloqs.unselectAllConnections();
            $scope.robotSelected = $scope.boardSelected = false;
            $('.component').removeClass('component-selected');
            if ($scope.currentProject.bitbloqConnectBT) {
                $scope.componentSelected = $scope.currentProject.bitbloqConnectBT;
            }
        } else if (!ev.target.classList.contains('component-name__input') && !ev.target.classList.contains('oscillator--checkbox') && !$(ev.target)
            .closest('.component-name__container').length) {
            $scope.robotSelected = $scope.boardSelected = $scope.componentSelected = false;
            $('.component').removeClass('component-selected');
            hw2Bloqs.unselectAllConnections();
        }
    };

    $scope.duplicateComponent = function(copiedComponent) {
        copiedComponent = copiedComponent || $scope.hardware.clonComponent;
        if (copiedComponent) {
            var newComponent = _.cloneDeep(copiedComponent);
            delete newComponent.endpoints;
            delete newComponent.pin;
            delete newComponent.uid;
            newComponent.connected = false;
            $scope.currentProject.hardware.components.push(newComponent);

            var coordinates = {
                x: newComponent.coordinates.x > 85 ? 85 + 3 : newComponent.coordinates.x + 3,
                y: newComponent.coordinates.y > 85 ? 85 + 3 : newComponent.coordinates.y + 3
            };
            newComponent.coordinates = coordinates;
            newComponent.name = _createUniqueVarName(newComponent); //Generate unique name

            currentProjectService.addComponentInComponentsArray(newComponent.category, newComponent);

            var componentDOM = hw2Bloqs.addComponent(newComponent);
            if (!$scope.$$phase) {
                $scope.$digest();
            }
            _focusComponent(componentDOM);
            hw2Bloqs.unselectAllConnections();
        }
    };

    $scope.disconnectComponent = function(component) {
        component = component || $scope.componentSelected;
        hw2Bloqs.disconnectComponent(component);
        //currentProjectService.removeComponentInComponentsArray(component.category, component.name);
        $scope.componentSelected.connected = false;
        currentProjectService.startAutosave();
        _closeContextMenu();
    };

    $scope.disconnectAllComponents = function() {
        hw2Bloqs.disconnectAllComponents();
        $scope.currentProject.hardware.components.forEach(function(comp) {
            if (!comp.integratedComponent) {
                comp.connected = false;
            }
        });
        currentProjectService.startAutosave();
        _closeContextMenu();
    };

    $scope.deleteComponent = function() {
        $scope.disconnectComponent();
        var category;
        if ($scope.componentSelected.oscillator && ($scope.componentSelected.oscillator !== 'false')) {
            category = 'oscillators';
        } else {
            category = $scope.componentSelected.category;
        }

        var c = _.remove(currentProjectService.componentsArray[category], currentProjectService.findComponentInComponentsArray($scope.componentSelected.uid)),
            componentToRemove = $('[data-uid="' + c[0].uid + '"]')[0];
        $scope.componentSelected = false;
        hw2Bloqs.removeComponent(componentToRemove);
        currentProjectService.startAutosave();
    };

    $scope.hardware.cleanSchema = function() {
        hw2Bloqs.removeAllComponents();
        currentProjectService.setComponentsArray(bloqsUtils.getEmptyComponentsArray());
        $scope.deleteRobot();
        currentProjectService.startAutosave();
    };

    $scope.hardware.sortToolbox = function() {
        $log.log('sortToolbox');
        $scope.common.itsUserLoaded().finally(function() {
            var filteredList;
            if ($scope.currentProject.hardware.robot || $scope.currentProject.hardware.board === 'freakscar') {
                filteredList = [];

            } else if ($scope.currentProject.hardware.board && $scope.boardsMap[$scope.currentProject.hardware.board].availableComponents && $scope.boardsMap[$scope.currentProject.hardware.board].availableComponents.length > 0) {
                filteredList = _.filter($scope.common.userHardware.components, function(component) {
                    return $scope.boardsMap[$scope.currentProject.hardware.board].availableComponents.indexOf(component.uuid) !== -1;
                });
            } else {
                filteredList = _.filter($scope.common.userHardware.components, function(component) {
                    return component.manufacturer === 'standard' || component.manufacter === 'standard';
                });
            }

            var translatedList = _.each(filteredList, function(item) {
                item.name = $translate.instant(item.uuid);
            });

            $scope.hardware.componentSortered = _.sortBy(translatedList, 'name');
        });
    };
    $scope.drop = function(data) {
        hw2Bloqs.userInteraction = true;

        switch (data.type) {
            case 'boards':
                $scope.currentProjectService.showActivation = false;
                $scope.currentProjectService.closeActivation = false;
                var board = _.find($scope.hardware.boardList, function(board) {
                    return board.uuid === data.uuid;
                });
                _addBoard(board);
                $scope.changeToolbox('components');
                break;
            case 'components':
                if (!$scope.currentProject.hardware.board) {
                    $scope.changeToolbox('boards');
                    alertsService.add({
                        text: 'bloqs-project_alert_no-board',
                        id: 'error_noboard',
                        type: 'error'
                    });
                    return false;
                } else if ($scope.currentProject.hardware.robot) {
                    alertsService.add({
                        text: 'bloqs-project_alert_only-robot',
                        id: 'error_noboard',
                        type: 'error'
                    });
                    return false;
                }
                _addComponent(data);
                break;
            case 'robots':
                if ($scope.common.user || !data.robot || !data.robot.thirdParty) {
                    $scope.currentProjectService.showActivation = false;
                    $scope.currentProjectService.closeActivation = false;
                    var robotFamily = $scope.robotsMap[data.uuid].family;
                    var thirdPartyRobots = $scope.common.user ? $scope.common.user.thirdPartyRobots : false;
                    $scope.deleteBTComponent();
                    _addRobot(data);
                    if ($scope.common.section === 'bloqsproject') {
                        if (robotFamily && (!thirdPartyRobots || !thirdPartyRobots[robotFamily])) {
                            $scope.currentProjectService.showActivation = true;
                            $scope.currentProjectService.closeActivation = false;
                            $scope.showActivationModal(robotFamily);

                        }
                    } else {
                        $scope.isRobotActivatedInCenter();
                    }
                }
                break;
            case 'btComponent':
                if (!$scope.currentProject.hardware.board) {
                    $scope.changeToolbox('boards');
                    alertsService.add({
                        text: 'bloqs-project_alert_no-board',
                        id: 'error_noboard',
                        type: 'error'
                    });
                    return false;
                } else {
                    $scope.currentProjectService.showActivation = false;
                    $scope.currentProjectService.closeActivation = false;
                    if (!$scope.currentProject.hardware.board) {
                        $scope.subMenuHandler('boards', 'open', 1);
                        alertsService.add({
                            text: 'bloqs-project_alert_no-board',
                            id: 'error_noboard',
                            type: 'error'
                        });
                    } else if ($scope.currentProject.hardware.robot) {
                        alertsService.add({
                            text: 'bloqs-project_alert_only-robot',
                            id: 'error_noboard',
                            type: 'error'
                        });
                    } else {
                        _addBtComponent(data);
                    }
                }
                break;
        }

    };

    $scope.showActivationModal = function(robotFamily) {
        if ($scope.common.section !== 'exercise') {
            $scope.currentProjectService.showActivationModal(robotFamily);
        }
    };

    $scope.closeActivationWarning = function() {
        $scope.currentProjectService.closeActivation = !$scope.currentProjectService.closeActivation;
    };

    function _addBtComponent() {
        if (!$scope.currentProject.useBitbloqConnect) {
            $scope.currentProject.useBitbloqConnect = true;
            $scope.currentProject.bitbloqConnectBT = {
                message: ($scope.currentProject.hardware.board === 'bqZUM' || $scope.currentProject.hardware.board === 'bqZUM20') ? $scope.common.translate('device-has-bluetooth') : $scope.common.translate('device-needs-bluetooth')
            };

            var btConnected = _.find(currentProjectService.componentsArray.serialElements, function(component) {
                return component.uuid === 'bt';
            });
            if (!btConnected || !btConnected.connected) {
                $scope.isMobileConnected = true;
            }

        }
        currentProjectService.startAutosave();
    }

    $scope.deleteBTComponent = function() {
        $scope.currentProject.useBitbloqConnect = false;
        $scope.componentSelected = false;
        if (projectService.project.bitbloqConnectBT && projectService.project.bitbloqConnectBT.name) {
            currentProjectService.removeComponentInComponentsArray('serialElements', $scope.currentProject.bitbloqConnectBT.name);
        }

        $scope.closeBluetoothInteraction();
        $scope.currentProject.bitbloqConnectBT = null;
        currentProjectService.startAutosave();
    };

    $scope.setBaudRate = function(baudRate) {
        $scope.componentSelected.baudRate = baudRate;
        currentProjectService.startAutosave();
    };

    $scope.checkName = function() {
        var usedComponentNames = {},
            duplicatedNames = [];
        var componentsList = [];

        //now filled from componentsArray, when all components will be in hardware.components with
        //the connected flag, change here
        _.forEach(currentProjectService.componentsArray, function(category) {

            if (category.length > 0) {
                category.forEach(function(comp) {
                    if (!comp.integratedComponent) {
                        componentsList.push(comp);
                    }
                });
            }

        });

        //end of getting componentList

        for (var i = 0; i < componentsList.length; i++) {
            componentsList[i].name = componentsList[i].name.replace(/[0-9]*/, '');
            if (!componentsList[i].name) {
                componentsList[i].name = _createUniqueVarName(componentsList[i]);
            } else {
                componentsList[i].name = utils.removeDiacritics(componentsList[i].name);
            }
            if (usedComponentNames[componentsList[i].name]) {
                //the componentSelected must be always a duplicated
                if ($scope.componentSelected === usedComponentNames[componentsList[i].name]) {
                    duplicatedNames.push($scope.componentSelected);
                    usedComponentNames[componentsList[i].name] = componentsList[i];
                } else {
                    duplicatedNames.push(componentsList[i]);
                }
            } else {
                usedComponentNames[componentsList[i].name] = componentsList[i];
            }
        }
        //avoid watchers using a temp var
        var tempName = '',
            maxAttempts = 25,
            attempt = 0;

        for (var j = 0; j < duplicatedNames.length; j++) {

            tempName = duplicatedNames[j].name + '_copy';
            attempt = 0;
            while ((attempt < maxAttempts) && usedComponentNames[tempName]) {
                tempName += '_copy';
                attempt++;
            }
            if (usedComponentNames[tempName]) {
                tempName += 'to_the_sky_and_far_away';
            }
            tempName = utils.removeDiacritics(_validName(tempName));
            duplicatedNames[j].name = tempName;
            usedComponentNames[tempName] = true;
        }

        $scope.updateBloqs();

        currentProjectService.startAutosave();

    };

    /***************************************
     * Private functions
     ****************************************/

    function _initialize() {
        hardwareService.itsHardwareLoaded().then(function() {
            $scope.robotsMap = projectService.getRobotsMap(hardwareService.hardware);
            $scope.boardsMap = _getBoardsMap(hardwareService.hardware);
            $scope.componentsMap = _getComponentsMap(hardwareService.hardware);
        });
        $scope.common.itsUserLoaded().finally(function() {
            $scope.hardware.boardList = $scope.common.userHardware.boards;
            $scope.hardware.robotList = $scope.common.userHardware.robots;
        });
        $scope.hwBasicsLoaded.resolve();
        $scope.hardware.sortToolbox();

        hw2Bloqs.initialize(container, 'boardSchema', 'robotSchema');

        container.addEventListener('mousedown', _mouseDownHandler, true);

        $document.on('contextmenu', _contextMenuDocumentHandler);
        $document.on('click', _clickDocumentHandler);

        container.addEventListener('connectionEvent', connectionEventHandler);
    }

    function _getBoardsMap(hardwareConstants) {
        var map = {};
        for (var i = 0; i < hardwareConstants.boards.length; i++) {
            map[hardwareConstants.boards[i].uuid] = hardwareConstants.boards[i];
        }
        return map;
    }

    function _getComponentsMap(hardwareConstants) {
        var map = {};
        for (var i = 0; i < hardwareConstants.components.length; i++) {
            map[hardwareConstants.components[i].uuid] = hardwareConstants.components[i];
        }
        return map;
    }

    function _mouseDownHandler(e) {
        if (e.target.classList.contains('component')) {
            _focusComponent(e.target);
            if (!$scope.$$phase) {
                $scope.$digest();
            }
        }
    }

    function _closeContextMenu() {
        $('.hw-context-menu').css({
            display: 'none'
        });
    }

    function _contextMenuDocumentHandler(ev) {
        if (ev.target.classList.contains('component')) {
            if ((angular.element($window).height() - event.pageY) > $componentContextMenu.height()) {
                $componentContextMenu.css({
                    display: 'block',
                    left: event.pageX + 'px',
                    top: event.pageY + 'px'
                });
            } else {
                $componentContextMenu.css({
                    display: 'block',
                    left: event.pageX + 'px',
                    top: (event.pageY - $componentContextMenu.height()) + 'px'
                });
            }
            _focusComponent(ev.target);
        } else if (ev.target.classList.contains('board') || $(ev.target).closest('.board').length) {
            if ($scope.currentProject.hardware.board) {
                $boardContextMenu.css({
                    display: 'block',
                    left: event.pageX + 'px',
                    top: event.pageY + 'px'
                });
            }
        } else if (ev.target.classList.contains('robot')) {
            $robotContextMenu.css({
                display: 'block',
                left: event.pageX + 'px',
                top: event.pageY + 'px'
            });
        } else if (ev.target.classList.contains('bitbloqconnect-icon')) {
            $bTComponentContextMenu.css({
                display: 'block',
                left: event.pageX + 'px',
                top: event.pageY + 'px'
            });
        } else {
            _closeContextMenu();
        }

        ev.preventDefault();
        return false;
    }

    function _clickDocumentHandler() {
        _closeContextMenu();
    }

    function checkComponentConnections(componentUid) {
        var component = currentProjectService.findComponentInComponentsArray(componentUid);
        var connections = 0;
        if (component) {
            _.forEach(component.pin, function(value) {
                if (!_.isNull(value) && !_.isUndefined(value)) {
                    connections++;
                }
            });
        }
        if (connections === 0) {
            component.connected = false;
        }
    }

    function connectionEventHandler(e) {
        var componentReference, pinKey;
        /* HW Connection listeners */

        function _detectConnected(pins) {
            var filtered = _.filter(pins, function(pin) {
                return pin !== undefined;
            });
            return filtered.length > 0;
        }

        componentReference = currentProjectService.findComponentInComponentsArray(e.componentData.uid);
        $scope.closeComponentInteraction(componentReference.pin, e.componentData.pin);
        if (($scope.isMobileConnected || $scope.isMobileConnected === undefined) && componentReference.uuid === 'bt') {
            $scope.closeBluetoothInteraction(componentReference.pin, e.componentData.pin);
        }

        if (componentReference) {
            if (e.protoBoLaAction === 'attach') {
                pinKey = Object.keys(e.componentData.pin)[0];

                componentReference.pin[pinKey] = e.componentData.pin[pinKey];

                $rootScope.$emit('component-connected');

                if (hw2Bloqs.userInteraction) {
                    if ($scope.showCompileWarningByComponent($scope.currentProject.hardware.board, componentReference, e.componentData.pin)) {
                        alertsService.add({
                            text: 'connect_alert_01',
                            id: 'connect-error',
                            type: 'warning'
                        });
                    }
                }

            } else if (e.protoBoLaAction === 'detach') {
                hw2Bloqs.userInteraction = true;
                pinKey = Object.keys(e.componentData.pin)[0];
                if (componentReference.pin.hasOwnProperty(pinKey)) {
                    componentReference.pin[pinKey] = undefined;
                }

            }

            if (_detectConnected(componentReference.pin)) {
                componentReference.connected = true;
            } else {
                componentReference.connected = false;
            }

            if (($scope.common.session.save || $scope.currentProjectLoaded.promise.$$state.status === 1) && hw2Bloqs.userInteraction) {
                currentProjectService.startAutosave();
            }

        } else {
            $log.debug('Unable to find this component or component is already removed');
        }
    }

    function _addIntegratedComponents(board) {
        if (board.integratedComponents) {
            var tempComponent;
            for (var i = 0; i < board.integratedComponents.length; i++) {
                tempComponent = _.clone($scope.componentsMap[board.integratedComponents[i].id], true);
                _.extend(tempComponent, board.integratedComponents[i]);

                tempComponent.name = $scope.common.translate(board.integratedComponents[i].name);
                tempComponent.integratedComponent = true;
                tempComponent.connected = true;
                $scope.currentProject.hardware.components.push(tempComponent);
                currentProjectService.addComponentInComponentsArray(tempComponent.category, tempComponent);
            }
        }
    }

    function _addBoard(board) {
        if ($scope.currentProject.hardware.board !== board.uuid || $scope.currentProject.hardware.robot) {
            if ($scope.currentProject.hardware.showRobotImage || board.manufacturer || board.manufacter) {
                $scope.hardware.cleanSchema();

            } else if ($scope.currentProject.hardware.robot) {
                $scope.deleteRobot();
            }
            $scope.deleteBoard();

            hw2Bloqs.addBoard(board);

            $scope.currentProject.hardware.board = board.uuid;

            _changeBaudRate();
            $scope.hardware.sortToolbox();
            _addIntegratedComponents(board);

            if ($scope.currentProject.useBitbloqConnect) {
                $scope.deleteBTComponent();
                _addBtComponent();
            }

            currentProjectService.startAutosave();
        } else {
            $log.debug('same board');
        }
    }

    function _addRobot(robot) {

        var robotReference = _.find($scope.hardware.robotList, function(r) {
            return r.uuid === robot.uuid;
        });

        hw2Bloqs.removeRobot(robotReference);
        $scope.closeComponentInteraction();
        if (robotReference.useBoardImage || robotReference.uuid === 'freakscar') {
            var board = _.find($scope.hardware.boardList, function(board) {
                return board.uuid === robotReference.board;
            });
            _addBoard(board);
            if (robotReference.manufacturer === 'makeblock') {
                $scope.currentProject.hardware.showRobotImage = robot.uuid;
            }
            $scope.changeToolbox('components');
        } else {
            $scope.hardware.cleanSchema();
            $scope.currentProject.hardware.components = [];
            $scope.currentProject.hardware.robot = robot.uuid;
            $scope.currentProject.hardware.showRobotImage = null;
            hw2Bloqs.removeAllComponents();

            hw2Bloqs.addRobot(robotReference);
            $scope.currentProject.hardware.board = robotReference.board;

            $scope.componentSelected = null;
            $scope.hardware.sortToolbox();
            currentProjectService.setComponentsArray();
            currentProjectService.startAutosave();
        }

    }

    function _addComponent(data) {
        var component = $scope.componentsMap[data.uuid];

        if (!component.pin || !component.pin[Object.keys(component.pin)[0]]) { // if !autoConnected
            $scope.firstComponent = ($scope.firstComponent === undefined || ($scope.common.user && $scope.common.user.hasFirstComponent)) ? true : $scope.firstComponent;
            if ($scope.currentProject.useBitbloqConnect && data.id === 'bt') {
                $scope.isMobileConnected = !($scope.isMobileConnected === undefined || ($scope.common.user && $scope.common.user.isMobileConnected)) ? true : $scope.isMobileConnected;
            }
        }
        var boardMetadata = currentProjectService.getBoardMetaData();

        var newComponent = _.cloneDeep(component);

        switch (newComponent.uuid) {
            case 'device':
            case 'bt':
                switch (boardMetadata.uuid) {
                    case 'bqZUM':
                    case 'bqZUM20':
                        newComponent.baudRate = 19200;
                        break;
                    case 'FreaduinoUNO':
                    case 'ArduinoUNO':
                    case 'buildandcode':
                        newComponent.baudRate = 38400;
                        $scope.isMobileConnected = true;
                        break;
                }
                break;

        }

        currentProjectService.addComponentInComponentsArray(data.category, newComponent);

        var relativeCoordinates = {
            x: ((data.coordinates.x / container.clientWidth) * 100),
            y: ((data.coordinates.y / container.clientHeight) * 100)
        };

        newComponent.coordinates = relativeCoordinates;
        newComponent.category = data.category;
        newComponent.name = _createUniqueVarName(newComponent); //Generate unique name
        newComponent.connected = false;

        hw2Bloqs.unselectAllConnections();
        var componentDOMRef = hw2Bloqs.addComponent(newComponent);
        _focusComponent(componentDOMRef);
        $scope.boardSelected = false;
        if (newComponent.wirelessConnection) {
            currentProjectService.startAutosave();
        }
    }

    function _changeBaudRate() {
        if ($scope.currentProject.hardware.components.length > 0) {
            _.find($scope.currentProject.hardware.components, function(item) {
                if (item.uuid === 'bt') {
                    switch (currentProjectService.getBoardMetaData().uuid) {
                        case 'bqZUM':
                        case 'bqZUM20':
                            item.baudRate = 19200;
                            break;
                        case 'FreaduinoUNO':
                        case 'ArduinoUNO':
                        case 'buildandcode':
                            item.baudRate = 38400;
                            break;
                    }
                }
            });
        }
    }

    function _focusComponent(component) {

        $('.component').removeClass('component-selected');

        var componentSelected = currentProjectService.findComponentInComponentsArray(component.dataset.uid);
        $(component).addClass('component-selected');

        container.focus();

        $scope.componentSelected = componentSelected;
        $scope.boardSelected = false;

    }

    $scope.hasDownloadedApp = function() {
        if ($scope.common.user) {
            userApi.update({
                hasDownloadedApp: true
            });
        }
    };

    function _createUniqueVarName(component) {
        var componentBasicName = component.name ? component.name.replace(/[0-9]*/, '') : '',
            componentsNames = [];

        if (componentBasicName) {
            if (parseInt(componentBasicName.substring(componentBasicName.lastIndexOf('_') + 1, componentBasicName.length))) {
                componentBasicName = componentBasicName.substring(0, componentBasicName.lastIndexOf('_'));
            }
        } else {
            if (component.uid === 'btComponent') {
                componentBasicName = $scope.common.translate('device').toLowerCase();
            } else {
                componentBasicName = $translate.instant('default-var-name-' + component.uuid);
            }
        }

        if (component.category) {
            currentProjectService.componentsArray[component.category].forEach(function(comp) {
                componentsNames[comp.name] = true;
            });
            if (component.category === 'oscillators') {
                currentProjectService.componentsArray.servos.forEach(function(comp) {
                    componentsNames[comp.name] = true;
                });
            } else if (component.category === 'servos') {
                currentProjectService.componentsArray.oscillators.forEach(function(comp) {
                    componentsNames[comp.name] = true;
                });
            }
        }
        if (componentsNames[componentBasicName]) {
            var j = 2,
                finalName = null;
            while (!finalName) {
                if (!componentsNames[componentBasicName + '_' + j]) {
                    finalName = componentBasicName + '_' + j;
                }
                j++;
            }
            componentBasicName = finalName || componentBasicName;
        }
        return componentBasicName;
    }

    function _removeElementFromKeyboard(focusedElement) {
        if (focusedElement.classList.contains('bitbloqconnect-icon')) {
            $scope.deleteBTComponent(focusedElement);
        } else if ($scope.componentSelected) {
            $scope.deleteComponent();
            $scope.componentSelected = false;
        } else if ($scope.boardSelected) {
            $scope.deleteBoard();
        } else if ($scope.robotSelected) {
            $scope.deleteRobot();
        } else { //No component or board selected
            var componentUid = hw2Bloqs.removeSelectedConnection();
            checkComponentConnections(componentUid);
        }
    }

    function _loadHardwareProject(hardwareProject) {
        hw2Bloqs.userInteraction = false;
        if (hardwareProject.anonymousTransient) {
            delete hardwareProject.anonymousTransient;
        }

        var hwSchema = {},
            conectableComponents = _.filter($scope.currentProject.hardware.components, function(item) {
                return !item.integratedComponent;
            });
        hwSchema.components = _.cloneDeep(conectableComponents);
        hwSchema.connections = _.cloneDeep($scope.currentProject.hardware.connections);

        $scope.hwBasicsLoaded.promise.then(function() {
            if ($scope.currentProject.hardware.robot) {
                currentProjectService.getRobotMetaData().then(function(response) {
                    hwSchema.robot = response; //The whole board object is passed
                    loadComponentsSchema(hwSchema, conectableComponents);
                });

            } else if ($scope.currentProject.hardware.board) {
                var boardReference = currentProjectService.getBoardMetaData();
                var showRobotImage = $scope.currentProject.hardware.showRobotImage;
                if ($scope.common.user && showRobotImage) {
                    var thirdPartyRobots = $scope.common.user.thirdPartyRobots;
                    if ($scope.common.section === 'bloqsproject') {
                        if ($scope.common.user && !thirdPartyRobots || !thirdPartyRobots[$scope.robotsMap[showRobotImage].family] && showRobotImage) {
                            $scope.currentProjectService.showActivation = true;
                            $scope.currentProjectService.closeActivation = false;
                        }
                    }
                }

                hwSchema.board = boardReference; //The whole board object is passed
                loadComponentsSchema(hwSchema, conectableComponents);
            }

        });
    }

    function loadComponentsSchema(hwSchema, conectableComponents) {
        if (hwSchema.robot || hwSchema.board) {
            hw2Bloqs.loadSchema(hwSchema);
            hw2Bloqs.repaint();
            $scope.hardware.firstLoad = false;
            //Fix components dimensions
            _.forEach(conectableComponents, function(item) {
                item = bloqsUtils.checkPins(item);
                _fixComponentsDimension(item);
            });

            $scope.hardware.sortToolbox();
        } else {
            $log.debug('robot is undefined');
        }

    }

    function _fixComponentsDimension(compRef) {
        hardwareService.itsHardwareLoaded().then(function() {
            var c = _.find(hardwareService.hardware.components, {
                'uuid': compRef.uuid
            });
            var componentDOM = document.querySelector('[data-uid="' + compRef.uid + '"]');
            componentDOM.style.width = c.width + 'px';
            componentDOM.style.height = c.height + 'px';
        });
    }

    function _validName(name) {
        var reservedWords = 'setup,loop,if,else,for,switch,case,while,do,break,continue,return,goto,define,include,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,true,false,interger, constants,floating,point,void,bool,char,unsigned,byte,int,word,long,float,double,string,String,array,static, volatile,const,sizeof,pinMode,digitalWrite,digitalRead,analogReference,analogRead,analogWrite,tone,noTone,shiftOut,shitIn,pulseIn,millis,micros,delay,delayMicroseconds,min,max,abs,constrain,map,pow,sqrt,sin,cos,tan,randomSeed,random,lowByte,highByte,bitRead,bitWrite,bitSet,bitClear,bit,attachInterrupt,detachInterrupt,interrupts,noInterrupts';
        reservedWords = reservedWords.split(',');
        if (name && name.length > 0) {
            var i = 0,
                j = 0;
            while (i < name.length) {
                if (!isNaN(parseFloat(name[i]))) {
                    name = name.substring(1, name.length);
                } else {
                    break;
                }
            }
            //Remove all accents
            name = name.replace(/([áàâä])/g, 'a').replace(/([éèêë])/g, 'e').replace(/([íìîï])/g, 'i')
                .replace(/([óòôö])/g, 'o').replace(/([úùûü])/g, 'u');
            name = name.replace(/([ÁÀÂÄ])/g, 'A').replace(/([ÉÈÊË])/g, 'E').replace(/([ÍÌÎÏ])/g, 'I')
                .replace(/([ÓÒÔÖ])/g, 'O').replace(/([ÚÙÛÜ])/g, 'U');
            //Remove spaces and ñ
            name = name.replace(/([ ])/g, '_')
                .replace(/([ñ])/g, 'n');
            //Remove all symbols
            name = name.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&\Ç\%\=\~\{\}\¿\¡\"\@\:\;\-\"\·\|\º\ª\¨\'\·\̣\─\ç\`\´\¨\^])/g, '');
            i = 0;
            while (i < name.length) {
                if (!isNaN(parseFloat(name[i]))) {
                    name = name.substring(1, name.length);
                } else {
                    break;
                }
            }
            for (j = 0; j < reservedWords.length; j++) {
                if (name === reservedWords[j]) {
                    name += '_';
                    break;
                }
            }
        }
        return name;
    }

    function _getClonComponent() {
        $scope.hardware.clonComponent = _.cloneDeep($scope.componentSelected);
    }

    /*************************************************
     Shortcuts
     *************************************************/
    $scope.onKeyPress = function(evt) {
        switch (evt.keyCode) {
            case 67:
                //ctrl+c
                if (evt.ctrlKey) {
                    if (!evt.target.classList.contains('component-name__input')) {
                        _getClonComponent();
                        evt.preventDefault();
                    }
                }
                break;
            case 86:
                //ctrl+v
                if (evt.ctrlKey) {
                    if (!evt.target.classList.contains('component-name__input')) {
                        $scope.duplicateComponent();
                        evt.preventDefault();
                    }
                }
                break;
                // case 90:
                //     //ctr+z
                //     if (evt.ctrlKey) {
                //         $scope.undo();
                //         evt.preventDefault();
                //     }
                //     break;
                // case 89:
                //     //ctr+y
                //     if (evt.ctrlKey) {
                //         $scope.redo();
                //         evt.preventDefault();
                //     }
                //     break;
            case 8:
                //backspace
                if (!evt.target.classList.contains('component-name__input')) {
                    _removeElementFromKeyboard(evt.target);
                    evt.preventDefault();
                }
                break;
            case 46:
                //Supr
                if (!evt.target.classList.contains('component-name__input')) {
                    _removeElementFromKeyboard(evt.target);
                    evt.preventDefault();
                }
                break;
        }
    };

    // toolbox filter components
    $scope.searchText = '';
    $scope.filterSearch = function(criteria) {
        return function(item) {
            if (criteria === '') {
                return false;
            }
            var translatedNameNormalized = utils.removeDiacritics($translate.instant(item.uuid), {
                spaces: false
            }).toLowerCase();
            var criteriaNormalized = utils.removeDiacritics(criteria, {
                spaces: false
            }).toLowerCase();
            return translatedNameNormalized.indexOf(criteriaNormalized) > -1;
        };
    };
    /* Initialize jsplumb */
    _initialize();

    $scope.baudRates = ['300', '1200', '2400', '4800', '9600', '14400', '19200', '28800', '38400', '57600', '115200'];
    $scope.componentSelected = null;

    $scope.offsetTop = ['header', 'nav--make', 'actions--make', 'tabs--title'];
    $scope.firstComponent = undefined;
    $scope.isMobileConnected = undefined;

    $scope.$watch('componentSelected.oscillator', function(newVal, oldVal) {
        if (newVal !== oldVal) {
            var index;
            if (newVal && (newVal !== 'false')) {
                index = currentProjectService.componentsArray.servos.indexOf($scope.componentSelected);
                if (index > -1) {
                    currentProjectService.componentsArray.servos.splice(index, 1);
                    currentProjectService.componentsArray.oscillators.push($scope.componentSelected);
                }

            } else {
                index = currentProjectService.componentsArray.oscillators.indexOf($scope.componentSelected);
                if (index > -1) {
                    currentProjectService.componentsArray.oscillators.splice(index, 1);
                    currentProjectService.componentsArray.servos.push($scope.componentSelected);
                }
            }
            currentProjectService.startAutosave();
        }
    });

    $scope.$watch('componentSelected.name', function(newVal, oldVal) {
        if (oldVal === '' && newVal !== '') {
            $timeout.cancel($scope.timeoutCode);
            currentProjectService.startAutosave();
        } else {
            if (newVal && oldVal && (newVal !== oldVal)) {
                $scope.checkName();
                $scope.updateBloqs().then(function() {
                    currentProjectService.completedProject();
                    utils.apply($scope);
                });
            } else if (newVal === '') {
                $timeout.cancel($scope.timeoutCode);
                $scope.timeoutCode = $timeout(function() {
                    $scope.componentSelected.name = _createUniqueVarName($scope.componentSelected);
                    $scope.updateBloqs();
                    currentProjectService.startAutosave();
                }, 3000);
            }
        }
    });

    $scope.$on('$destroy', function() {
        container.removeEventListener('connectionEvent', connectionEventHandler);
        container.removeEventListener('mousedown', _mouseDownHandler);
        $document.off('contextmenu', _contextMenuDocumentHandler);
        $document.off('click', _clickDocumentHandler);
        $scope.initHardwarePromise();
        drawHardwareEvent();
        translateChangeEndEvent();
    });

    var translateChangeEndEvent = $rootScope.$on('$translateChangeEnd', function() {
        $scope.hardware.sortToolbox();
    });

    var drawHardwareEvent = $rootScope.$on('drawHardware', function() {
        if ($scope.currentProject.hardware.board || $scope.currentProject.hardware.robot) {
            _loadHardwareProject($scope.currentProject.hardware);
        }
        $scope.hardware.firstLoad = true;
    });

}
