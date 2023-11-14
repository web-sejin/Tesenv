import React, {useState, useEffect, useRef} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Button,
  Dimensions,
  LogBox,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  useColorScheme,
  View,
  Platform,
  Alert,
  TouchableOpacity,
  Linking
} from 'react-native';
import { WebView } from 'react-native-webview';
import SplashScreen from 'react-native-splash-screen';
import {check, checkMultiple, PERMISSIONS, RESULTS, request, requestMultiple} from 'react-native-permissions';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import { CALL_PERMISSIONS_NOTI, usePermissions } from './hooks/usePermissions'; 
import { KakaoOAuthToken, KakaoProfile, getProfile as getKakaoProfile, KakaoProfileNoneAgreement, login, logout, unlink } from '@react-native-seoul/kakao-login';
import {getProfile as getNaverProfile, NaverLogin} from "@react-native-seoul/naver-login";

const widnowHeight = Dimensions.get('window').height;
LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const naverAndroidKeys = {
  kConsumerKey: 'cqrJh6AUTv53qNOk1yWv',
  kConsumerSecret: '8TJHtWWjWT',
  kServiceAppName: 'TesEnv'
};

const naverIOSKeys = {
  kConsumerKey: "cqrJh6AUTv53qNOk1yWv",
  kConsumerSecret: "8TJHtWWjWT",
  kServiceAppName: "TesEnv",
  kServiceAppUrlScheme: "tesnaverlogin",
}

const naverKeyInit = Platform.OS === "ios" ? naverIOSKeys : naverAndroidKeys;

let keywordPopState = false;
let feedbackSendPopState = false;
let pointChargePopState = false;
let buyPopState = false;
let filterPopState = false;
let leaveConfirmPopState = false;
let completePopState = false;

const App = () => {
  let { height, width } = Dimensions.get('window');

  const app_domain = "https://cnj0010.cafe24.com";  
  const url = app_domain+"?app_chk=1&app_token=";

  const [urls, set_urls] = useState("ss");
  const [appToken, setAppToken] = useState();
  const webViews = useRef();
  const [is_loading, set_is_loading] = useState(true);
  const [currUrl, setCurrUrl] = useState('');
  const [naverToken, setNaverToken] = useState('');
  const [naverError, setNaverError] = useState('');

  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [t3, setT3] = useState('');

  let canGoBack = false;
  let timeOut;

  //권한
  if(Platform.OS == 'android'){
    usePermissions(CALL_PERMISSIONS_NOTI);
  }  

  //토큰값 구하기
  useEffect(() => {
    PushNotification.setApplicationIconBadgeNumber(0);

    async function requestUserPermission() {
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            //console.log('Authorization status:', authStatus);
        if (enabled) {
            //console.log('Authorization status:', authStatus);
            await get_token();
        }
    }

    //기기토큰 가져오기
    async function get_token() {
        await messaging()
            .getToken()
            .then(token => {
                //console.log("appToken", token);
                if(token) {
                  setAppToken(token);
                    return true;
                } else {
                    return false;
                }
            });
    }

    requestUserPermission();

    set_is_loading(true);

    return messaging().onTokenRefresh(token => {
      setAppToken(token);
    });
  } ,[]);

  function fnPopState(pop_id, type){
    //console.log(pop_id);
    if(pop_id == "keyword_pop"){
      keywordPopState = type;
    }else if(pop_id == "feedback_send_pop"){
      feedbackSendPopState = type;
    }else if(pop_id == "point_charge_pop"){
      pointChargePopState = type;
    }else if(pop_id == "buy_pop"){
      buyPopState = type;
    }else if(pop_id == "filter_pop"){
      filterPopState = type;
    }else if(pop_id == "leave_comfirm_pop"){
      leaveConfirmPopState = type;
    }else if(pop_id == "complete_pop"){
      completePopState = type;
    }
  }

  const snsHandler = async (snsName) => {     
    if(snsName === 'naver'){
      naverLogin(naverKeyInit);
    }else if(snsName === 'kakao'){
      signInWithKakao();
    }
  }
  
  //네이버 시작
  const naverLogin = (props) => {    
    setT1('t1');
    return new Promise((resolve, reject) => {
      setT2('t2');
      NaverLogin.login(props, (err, token) => {        
        //console.log('naverLogin : ',token);
        setT3('t3');
        setNaverToken(token);
        if (err) {
            console.log('err:::', err)
            setNaverError('naver Error');
            reject(err)
            return;
        }
        resolve(token);           
      });
    });
  };

  function naverLogout() {
    NaverLogin.logout();
    setNaverToken("");
  };

  const getNaverUserProfile = async () => {
    const profileResult = await getNaverProfile(naverToken.accessToken);
    if (profileResult.resultcode === "024") {
      Alert.alert("로그인 실패", profileResult.message);
      return;
    }
    console.log("naver Result", profileResult);    
    const naverData =JSON.stringify({
      type: "sns_login",
      name: profileResult.response.name,
      email: profileResult.response.email,
      provider: "naver",
      photourl: "",
      uid: profileResult.response.id,          
      token: appToken
    });
    //console.log(naverData);    
    webViews.current.postMessage(naverData);
  };

  useEffect(() => {
    if(naverToken != ""){ //네이버 토큰이 존재하는 경우 네이버 회원정보 가져오기 실행
      console.log('naverToken');
      getNaverUserProfile();
      naverLogout();
    }
  }, [naverToken]);
  //네이버 끝

  /* 카카오 시작 */
  const signInWithKakao = async () => {
    try {			
      const token: KakaoOAuthToken = await login();	  
      getMyKakaoProfile();
    } catch(err) {
      console.log("error : ",err);
    }
  };
  
  const signOutWithKakao = async () => {
    console.log("카톡 로그아웃");
    try {
      const message = await logout();
      console.log(message);
    } catch(err) {
      console.log(err);
      
    }
  };
  
  const getMyKakaoProfile = async () => {			
    try {      
      const profile: KakaoProfile|KakaoProfileNoneAgreement = await getKakaoProfile();
      //console.log('kakao result ::: ',profile);
      const kakaoData =JSON.stringify({
          type: "sns_login",
          name: "",
          email: "",
          provider: "kakao",
          uid: profile.id,          
          token: appToken,
      });
      //console.log('kakao result ::: ',kakaoData);
      webViews.current.postMessage(kakaoData);
      unlinkKakao();
			
    } catch(err) {
      console.log(err);
    }
  };
  
  const unlinkKakao = async () => {
    try {
      
      const message = await unlink();
      console.log(message);
    } catch(err) {
      console.log(err);
      
    }
  };
  /* 카카오 끝 */

  //링크 이동
  function moveToUrl(url){
    setCurrUrl("pushUrlCheck");
    const pushUrlData =JSON.stringify({
        type: "pushUrl",
        url: url
    });
    console.log(pushUrlData);
    webViews.current.postMessage(pushUrlData);
  }

  //푸시메세지 처리
  useEffect(() => {
    //포그라운드 상태
    messaging().onMessage(remoteMessage => {
        if (remoteMessage) {
            console.log('포그라운드 상태 푸시 : ', remoteMessage.data);

            //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
            let newURL = '';
            if(remoteMessage.data.intent) { newURL = remoteMessage.data.intent; }            

            Alert.alert(
                remoteMessage.notification.title, remoteMessage.data.body,
                [
                    { text: '네', onPress: () => moveToUrl(newURL), },
                    { text: '아니요', onPress: () => setCurrUrl('') }
                ]
            );
        }
    });

    //백그라운드 상태
    messaging().onNotificationOpenedApp(remoteMessage => {
        PushNotification.setApplicationIconBadgeNumber(0);

        if (remoteMessage) {
            console.log('백그라운드 상태 푸시 : ', remoteMessage);       

            //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
            let newURL = '';
            if(remoteMessage.data.intent) { newURL = remoteMessage.data.intent; }            

            Alert.alert(
                remoteMessage.notification.title, remoteMessage.data.body,
                [
                    { text: '네', onPress: () => moveToUrl(newURL), },
                    { text: '아니요', onPress: () => setCurrUrl('') }
                ]
            );
        }
    });

    //종료상태
    messaging().getInitialNotification().then(remoteMessage => {
        if (remoteMessage) {
            console.log('종료 상태 푸시 : ', remoteMessage);

            //푸시 data 에 intent값 으로 웹뷰에 스크립트 처리
            let newURL = '';
            if(remoteMessage.data.intent) { newURL = remoteMessage.data.intent; }
            setTimeout(function(){
              Alert.alert(
                  remoteMessage.notification.title, remoteMessage.data.body,
                  [
                      { text: '네', onPress: () => moveToUrl(newURL), },
                      { text: '아니요', onPress: () => setCurrUrl('') }
                  ]
              );
            },1500);
        }
    });
}, []);

  //포스트메세지 (웹 -> 앱)
  const onWebViewMessage = (webViews) => {
    let jsonData = JSON.parse(webViews.nativeEvent.data);
    console.log("jsonData.data : ", jsonData.data);
    if(jsonData.data == "popup"){      
      fnPopState(jsonData.pop_id, jsonData.type);
    }else if(jsonData.data == "kakaoChanel"){
      Linking.openURL(jsonData.url);
    }else if(jsonData.data == "snsLogin"){      
      snsHandler(jsonData.sns);
    }
  }

  const onNavigationStateChange = (webViewState)=>{
    set_urls(webViewState.url);
    
    console.log("webViewState.url : ", webViewState.url);

    keywordPopState = false;
    feedbackSendPopState = false;
    pointChargePopState = false;
    buyPopState = false;
    filterPopState = false;
    leaveConfirmPopState = false;
    completePopState = false;

    //웹에 chk_app 세션 유지 위해 포스트메시지 작성
    const chkAppData =JSON.stringify({
      type: "chk_app_token",
      isapp: "1",
      istoken: appToken,
    });
    webViews.current.postMessage(chkAppData);
  }

  //뒤로가기 버튼
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();

    console.log(urls);
  }, [urls]);

  const backAction = () => {
    const app_split = urls.split('?app_chk=')[0];    
    //console.log(app_split);
    
    if(keywordPopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "keyword_pop" });      
      webViews.current.postMessage(popOffData);
    }else if(feedbackSendPopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "feedback_send_pop" });
      webViews.current.postMessage(popOffData);
    }else if(pointChargePopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "point_charge_pop" });
      webViews.current.postMessage(popOffData);
    }else if(buyPopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "buy_pop" });
      webViews.current.postMessage(popOffData);
    }else if(filterPopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "filter_pop" });
      webViews.current.postMessage(popOffData);
    }else if(leaveConfirmPopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "leave_comfirm_pop" });
      webViews.current.postMessage(popOffData);
    }else if(completePopState){
      const popOffData =JSON.stringify({ type: "popOff", pop_id: "complete_pop" });
      webViews.current.postMessage(popOffData); 
    }else{
      if (
          app_split == app_domain + '/' ||
          app_split == app_domain ||
          urls == app_domain ||
          urls == app_domain + '/' ||
          urls == app_domain + '/index.php' ||
          //urls.indexOf("login.php") != -1 ||
          urls.indexOf("request_write.php") != -1 ||
          urls.indexOf("request_list.php") != -1 ||
          urls.indexOf("business_list.php") != -1 ||
          urls.indexOf("notice_list.php") != -1
      ){     
          if(!canGoBack){ 
              ToastAndroid.show('한번 더 누르면 종료합니다.', ToastAndroid.SHORT);
              canGoBack = true;

              timeOut = setTimeout(function(){
                canGoBack = false;
              }, 2000);
          }else{
              clearTimeout(timeOut);
              BackHandler.exitApp();
              canGoBack = false;
              //const sendData =JSON.stringify({ type:"종료" });

              keywordPopState = false;
              feedbackSendPopState = false;
              pointChargePopState = false;
              buyPopState = false;
              filterPopState = false;
              leaveConfirmPopState = false;
          }
      }else{
        if(currUrl == "pushUrlCheck"){
          moveToUrl('historyBack');
          setCurrUrl('');
        }else{
          webViews.current.goBack();
        }
      }
    }

    return true;
  };

  useEffect(() => { 
    setTimeout(function(){SplashScreen.hide();}, 1500);     
  }, []);

  return (
    <SafeAreaView style={{flex:1}}>
      {is_loading ? (
      <WebView
        ref={webViews}
        source={{
          uri: url+appToken,
        }}
        useWebKit={false}
        onMessage={webViews => onWebViewMessage(webViews)}
        onNavigationStateChange={(webViews) => onNavigationStateChange(webViews)}
        javaScriptEnabledAndroid={true}
        allowFileAccess={true}
        renderLoading={true}
        mediaPlaybackRequiresUserAction={false}
        setJavaScriptEnabled = {false}
        scalesPageToFit={true}
        allowsFullscreenVideo={true}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        textZoom = {100}
      />
      ) : (        
        <View style={{ height:widnowHeight, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  
});

export default App;
