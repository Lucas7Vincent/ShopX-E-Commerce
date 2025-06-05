// Import Firebase config
import { firebaseConfig } from './config.js';


const API_BASE = "https://localhost:7088/api/Auth";
let tempUser = null;

// Khởi tạo Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// === Helper Functions ===
function showForm(formId) {
  const formIds = ['loginForm', 'registerForm', 'forgotPasswordForm', 'resetPasswordForm', 'emailPrompt', 'forgotSuccessMessage', 'successMessage'];
  
  console.log(`🔄 Switching to form: ${formId}`);
  console.log(`📝 Available forms: ${formIds.join(', ')}`);
  
  // Ẩn tất cả các form
  formIds.forEach(id => {
    const form = document.getElementById(id);
    if (form) {
      form.classList.add('hidden');
      console.log(`  ✅ Hidden: ${id}`);
    } else {
      console.log(`  ❌ Not found: ${id}`);
    }
  });

  // Hiện form được yêu cầu
  const activeForm = document.getElementById(formId);
  if (activeForm) {
    activeForm.classList.remove('hidden');
    console.log(`  ✅ Shown: ${formId}`);
  } else {
    console.error(`  ❌ Target form not found: ${formId}`);
  }
}

// ✅ CRITICAL: Expose to global scope
window.showForm = showForm;

// ✅ THÊM: cancelSocialLogin function
function cancelSocialLogin() {
  console.log('🚫 Cancelling social login');
  tempUser = null;
  showForm('loginForm');
}

// ✅ Expose to global scope
window.cancelSocialLogin = cancelSocialLogin;
function showSuccessMessage() {
  document.querySelectorAll('[id$="Form"]').forEach(form => form.classList.add('hidden'));
  document.getElementById('successMessage')?.classList.remove('hidden');
  
  setTimeout(() => window.location.href = 'index.html', 1000);
}



// === On Load: Show correct form from hash ===
window.addEventListener('load', () => {
  const formId = window.location.hash.substring(1);
  if (formId) showForm(formId);
});

// === Registration ===
document.querySelector('#registerFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`;
  const email = document.getElementById('registerEmail').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) return alert("Mật khẩu không đủ mạnh!");
  if (password !== confirmPassword) return alert("Mật khẩu nhập lại không khớp!");

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, fullName, phone, address })
    });

    const data = await res.json();
    if (res.ok) {
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      showForm("loginForm");
    } else {
      alert("Đăng ký thất bại: " + (data.message || "Lỗi không xác định"));
    }
  } catch (err) {
    alert("Lỗi khi đăng ký: " + err.message);
  }
});

// === Login ===
document.querySelector('#loginFormSubmit')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  submitBtn.disabled = true;

  try {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    console.log('Login response data:', data);
    if (!response.ok) throw new Error(data.message || `Lỗi đăng nhập`);

    // Log thông tin vai trò để debug
    console.log('Role from API:', data.user?.role);
    console.log('Full API response data:', JSON.stringify(data, null, 2));
    
    // Lưu token và thông tin người dùng dưới dạng JSON
    sessionStorage.clear();
    sessionStorage.setItem('token', data.token);
    
    // Đảm bảo vai trò và thông tin shop được lưu chính xác
    let userRole = '';
    let shopName = '';
    
    if (data.user) {
        userRole = data.user.role || '';
        if (data.user.shopName) {
            shopName = data.user.shopName;
        } else if (data.shopName) {
            shopName = data.shopName;
        }
    } else if (data.role) {
        userRole = data.role;
        shopName = data.shopName || '';
    }
    
    console.log('Determined role value to save:', userRole);
    console.log('Determined shopName to save:', shopName);
    
    const userData = {
      fullName: data.user?.fullName || data.fullName || email,
      email: data.user?.email || email,
      phone: data.user?.phone || '',
      birthday: data.user?.birthday || '',
      gender: data.user?.gender,
      address: data.user?.address || '',
      avatar: data.user?.avatar || '',
      role: userRole,
      shopName: shopName
    };
    
    console.log('Role being saved:', userData.role);
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    // Nếu là seller, lấy thông tin shop nếu chưa có
    if (userRole.toLowerCase() === 'seller' && (!shopName || shopName === '')) {
      try {
        // Sử dụng sellerUtils nếu đã tải
        if (window.sellerUtils) {
          await window.sellerUtils.ensureShopInfo();
          console.log('Shop info updated by sellerUtils after login');
        }
      } catch (error) {
        console.error('Error getting shop info:', error);
      }
    }
    
    console.log('Token saved:', sessionStorage.getItem('token'));
    console.log('UserData saved:', sessionStorage.getItem('userData'));

    showSuccessMessage();
  } catch (error) {
    alert(`Đăng nhập thất bại: ${error.message}`);
  } finally {
    submitBtn.innerHTML = "Đăng nhập";
    submitBtn.disabled = false;
  }
});

// === Forgot Password ===
document.querySelector('#forgotPasswordFormSubmit')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  // Show loading
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang gửi...';
  submitBtn.disabled = true;

  try {
      const email = document.getElementById('forgotEmail').value.trim();

      // Validate email
      if (!email) {
          alert('Vui lòng nhập email.');
          return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          alert('Định dạng email không hợp lệ.');
          return;
      }

      console.log('📧 Sending password reset request...');

      // 🔥 GỬI REQUEST ĐẾN API
      const response = await fetch(`${API_BASE}/request-password-reset`, {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
          },
          body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
          console.log('✅ Password reset request successful');
          
          // Hiện success message
          document.getElementById('forgotPasswordForm').classList.add('hidden');
          document.getElementById('forgotSuccessMessage').classList.remove('hidden');
      } else {
          console.error('❌ Password reset request failed:', data.message);
          alert(data.message || 'Có lỗi xảy ra khi gửi yêu cầu');
      }
  } catch (error) {
      console.error('❌ Network error:', error);
      alert('Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.');
  } finally {
      // Reset button
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
  }
});

// === Reset Password ===
document.querySelector('#resetPasswordFormSubmit')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  
  // 🔥 LẤY TOKEN VÀ EMAIL TỪ URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const email = urlParams.get('email');

  if (!token || !email) {
      alert('Thiếu thông tin xác thực. Vui lòng thử lại từ email.');
      return;
  }

  // Validate password
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
      alert("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số!");
      return;
  }
  
  if (newPassword !== confirmNewPassword) {
      alert("Mật khẩu nhập lại không khớp!");
      return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';
  submitBtn.disabled = true;

  try {
      console.log('🔑 Resetting password...');

      const response = await fetch(`${API_BASE}/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
              token, 
              email, 
              newPassword, 
              confirmNewPassword 
          })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
          console.log('✅ Password reset successful');
          alert("Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.");
          
          // 🔥 REDIRECT VỀ LOGIN
          window.location.href = 'login.html';
      } else {
          console.error('❌ Password reset failed:', data.message);
          alert(data.message || "Lỗi khi đặt lại mật khẩu.");
      }
  } catch (error) {
      console.error('❌ Password reset error:', error);
      alert("Lỗi kết nối: " + error.message);
  } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
  }
});
// 🔥 XỬ LÝ URL PARAMETERS KHI LOAD TRANG
window.addEventListener('load', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const token = urlParams.get('token');
  const email = urlParams.get('email');
  
  if (action === 'reset' && token && email) {
      console.log('🔑 Reset password mode activated');
      
      // Hiện form reset password
      showForm('resetPasswordForm');
      
      // 🔥 VALIDATE TOKEN TRƯỚC KHI CHO NHẬP MẬT KHẨU (OPTIONAL)
      validateResetToken(token, email);
  }
});

// 🔥 VALIDATE TOKEN (OPTIONAL)
async function validateResetToken(token, email) {
  try {
      const response = await fetch(`${API_BASE}/validate-reset-token?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
          alert('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
          window.location.href = 'login.html';
      }
  } catch (error) {
      console.error('Token validation error:', error);
      alert('Không thể xác thực link. Vui lòng thử lại.');
      window.location.href = 'login.html';
  }
}

// === Social Login Handlers ===
document.getElementById('googleLogin')?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await handleSocialLogin(result.user);
  } catch (error) {
    alert("Đăng nhập bằng Google thất bại: " + error.message);
  }
});

document.getElementById('facebookLogin')?.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    await handleSocialLogin(result.user);
  } catch (error) {
    alert("Đăng nhập bằng Facebook thất bại: " + error.message);
  }
});

// === Handle Social Login Logic ===
async function handleSocialLogin(user) {
  const provider = user.providerData[0]?.providerId;
  
  console.log('🔍 Social login debug:', {
    provider: provider,
    email: user.email,
    displayName: user.displayName,
    uid: user.uid,
    providerData: user.providerData
  });
  
  // ✅ FIXED: Check database first for Facebook users
  if (!user.email && provider === 'facebook.com') {
    console.log('📧 Facebook login without email - checking existing account...');
    
    try {
      // ✅ NEW: Check if user already exists in database by Facebook UID
      const checkResponse = await fetch(`${API_BASE}/check-social-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          provider: provider,
          userId: user.uid
        })
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        console.log('📊 Check existing user response:', checkData);
        
        if (checkData.success && checkData.exists && checkData.user) {
          // ✅ User exists in database, use stored email
          console.log('✅ Found existing Facebook user in database:', checkData.user.email);
          user.email = checkData.user.email; // ✅ Set email from database
          
          // ✅ Continue with normal login flow
          await proceedWithSocialLogin(user, provider);
          return;
        }
      }
      
      // ✅ User doesn't exist or error occurred, show email prompt
      console.log('❌ No existing Facebook user found, showing email prompt');
      tempUser = { ...user };
      
      // ✅ CRITICAL: Use showForm to properly hide other forms
      showForm('emailPrompt');
      return;
      
    } catch (error) {
      console.error('❌ Error checking existing user:', error);
      // ✅ Fallback to email prompt
      tempUser = { ...user };
      showForm('emailPrompt');
      return;
    }
  }

  // ✅ For users with email or other providers
  await proceedWithSocialLogin(user, provider);
}

/**
 * ✅ NEW: Separate function for actual social login processing
 */
async function proceedWithSocialLogin(user, provider) {
  const requestData = {
    email: user.email,
    provider: provider,
    userId: user.uid,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    phoneNumber: user.phoneNumber || '',
    role: user.role || '',
    shopName: user.shopName || ''
  };

  try {
    console.log('🌐 Sending social login request:', requestData);
    
    const res = await fetch(`${API_BASE}/social-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });

    const data = await res.json();
    console.log('✅ Social login response data:', data);
    
    if (!res.ok) throw new Error(data.message || "Đăng nhập thất bại");

    // Log thông tin vai trò để debug
    console.log('Role from Social API:', data.user?.role || data.role);
    console.log('Full Social API response data:', JSON.stringify(data, null, 2));
    
    // Lưu token và thông tin người dùng dưới dạng JSON
    sessionStorage.clear();
    sessionStorage.setItem('token', data.token);
    
    // Đảm bảo vai trò và thông tin shop được lưu chính xác
    let userRole = '';
    let shopName = '';
    
    if (data.user) {
        userRole = data.user.role || '';
        if (data.user.shopName) {
            shopName = data.user.shopName;
        } else if (data.shopName) {
            shopName = data.shopName;
        }
    } else if (data.role) {
        userRole = data.role;
        shopName = data.shopName || '';
    }
    
    console.log('Determined role value to save:', userRole);
    console.log('Determined shopName to save:', shopName);
    
    const userData = {
      fullName: data.user?.fullName || data.fullName || user.displayName || user.email,
      email: data.user?.email || user.email,
      phone: data.user?.phone || user.phoneNumber || '',
      birthday: data.user?.birthday || '',
      gender: data.user?.gender,
      address: data.user?.address || '',
      avatar: data.user?.avatar || user.photoURL || '',
      role: userRole,
      shopName: shopName || ''
    };
    
    // Lưu userData vào sessionStorage
    sessionStorage.setItem('userData', JSON.stringify(userData));
    
    console.log('Social login - Role being saved:', userData.role);
    console.log('Token saved:', sessionStorage.getItem('token'));
    console.log('UserData saved:', sessionStorage.getItem('userData'));

    showSuccessMessage();
  } catch (error) {
    console.error('❌ Social login error:', error);
    alert("Đăng nhập thất bại: " + error.message);
  }
}
// Xử lý khi người dùng nhập email cho Facebook login
document.getElementById('emailPromptForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!tempUser) {
    alert('Lỗi: Thông tin đăng nhập tạm thời không tồn tại');
    showForm('loginForm');
    return;
  }

  const email = document.getElementById('socialEmail').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  // ✅ Validate email
  if (!email) {
    alert('Vui lòng nhập email');
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Định dạng email không hợp lệ');
    return;
  }
  
  // ✅ Show loading state
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';
  submitBtn.disabled = true;
  
  console.log('📧 Processing Facebook login with email:', email);
  
  try {
    // ✅ Check if email already exists in system
    const emailCheckResponse = await fetch(`${API_BASE}/check-email-exists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email })
    });
    
    if (emailCheckResponse.ok) {
      const emailCheckData = await emailCheckResponse.json();
      console.log('📊 Email check response:', emailCheckData);
      
      if (emailCheckData.exists && !emailCheckData.isSocialAccount) {
        // ✅ Email belongs to regular account
        alert('Email này đã được sử dụng cho tài khoản thường. Vui lòng sử dụng email khác hoặc đăng nhập bằng email và mật khẩu.');
        return;
      }
    }
    
    // ✅ Add email to tempUser and continue
    tempUser.email = email;
    
    // ✅ Process login with email
    await proceedWithSocialLogin(tempUser, 'facebook.com');
    
  } catch (error) {
    console.error('❌ Error processing Facebook login with email:', error);
    alert('Lỗi xử lý đăng nhập: ' + error.message);
    // ✅ Show email prompt again on error
    showForm('emailPrompt');
  } finally {
    // ✅ Reset button state
    submitBtn.innerHTML = '<i class="fas fa-arrow-right mr-2"></i>Tiếp tục đăng nhập';
    submitBtn.disabled = false;
    
    // ✅ Clear temp user
    tempUser = null;
  }
});

